-- ==========================================================
-- JYYR STORE — FINAL PRODUCTION MIGRATION
-- Run AFTER schema.sql + INTEGRATION_PATCH.sql
-- Safe for the current Supabase project.
-- ==========================================================

-- 1) Keep profile changes admin-only.
drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists profiles_update_admin_only on public.profiles;
create policy profiles_update_admin_only on public.profiles
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));


-- 3) Prevent an order from becoming processing/success before payment verification.
create or replace function public.guard_order_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('processing','success') then
    if not exists (
      select 1 from public.payments p
      where p.order_id = new.id
        and p.status = 'verified'
    ) then
      raise exception 'Payment must be verified before order can be processing/success';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_order_payment_status on public.orders;
create trigger guard_order_payment_status
before update of status on public.orders
for each row execute procedure public.guard_order_payment_status();

-- 4) Keep payment-proof bucket private and policies correct.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

drop policy if exists payment_proofs_insert on storage.objects;
create policy payment_proofs_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
);

drop policy if exists payment_proofs_select on storage.objects;
create policy payment_proofs_select on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
);

drop policy if exists payment_proofs_update on storage.objects;
create policy payment_proofs_update on storage.objects
for update to authenticated
using (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
)
with check (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
);

drop policy if exists payment_proofs_delete on storage.objects;
create policy payment_proofs_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
);

-- 5) Helpful indexes for the admin payment queue.
create index if not exists idx_payments_status_created_at
on public.payments(status, created_at desc);

create index if not exists idx_orders_status_created_at
on public.orders(status, created_at desc);

-- 5b) Fresh installs use a unique product name. Existing projects should only add this index
-- if their product names are already unique.
-- create unique index if not exists products_name_unique_idx on public.products(name);

-- 6) IMPORTANT:
-- Existing admin account can keep its Gmail address.
-- The final login page accepts either:
--   a) the real Auth email (recommended for the current admin), or
--   b) username@jyyr.store for accounts registered by the website.
-- Never put a Supabase service_role key in browser files.
-- ============================================================
-- JYYR STORE — SECURITY PATCH v2
-- Run AFTER schema.sql + INTEGRATION_PATCH.sql + FINAL_MIGRATION.sql
-- ============================================================

-- 1) Username -> Auth email lookup for username login.
-- This is required because Supabase signInWithPassword accepts email/password.
-- NOTE: this function intentionally exposes only the email needed for login;
-- do not expose auth.users directly through a view/table.
create or replace function public.get_auth_email_by_username(p_username text)
returns table(email text)
language sql
security definer
stable
set search_path = public, auth
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_username))
    and u.email is not null
  limit 1;
$$;

revoke all on function public.get_auth_email_by_username(text) from public;
grant execute on function public.get_auth_email_by_username(text) to anon, authenticated;

-- 2) Secure order creation.
-- Browser sends only product_id, target, quantity and payment method.
-- Product name, price, min/max and total are read/calculated here.
create or replace function public.create_order_secure(
  p_order_id text,
  p_product_id uuid,
  p_target text,
  p_quantity integer,
  p_payment_method text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_order public.orders%rowtype;
  v_total numeric(14,2);
  v_unit_price numeric(14,4);
  v_target text := trim(coalesce(p_target,''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_order_id is null or length(trim(p_order_id)) < 8 or length(trim(p_order_id)) > 80 then
    raise exception 'Invalid order ID';
  end if;

  if v_target = '' or length(v_target) > 500 then
    raise exception 'Target tidak valid';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity tidak valid';
  end if;

  if p_payment_method not in ('dana','qris') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and active = true
  for share;

  if not found then
    raise exception 'Produk tidak tersedia';
  end if;

  if p_quantity < v_product.min_quantity then
    raise exception 'Minimum order untuk produk ini adalah %', v_product.min_quantity;
  end if;

  if p_quantity > v_product.max_quantity then
    raise exception 'Maksimum order untuk produk ini adalah %', v_product.max_quantity;
  end if;

  v_unit_price := v_product.price;
  v_total := round(v_unit_price * p_quantity, 2);

  if v_total < 0 or v_total > 99999999999999.99 then
    raise exception 'Total order tidak valid';
  end if;

  insert into public.orders(
    id,user_id,product_id,product_name,target,quantity,unit_price,total,payment_method,status
  ) values (
    trim(p_order_id),auth.uid(),v_product.id,v_product.name,v_target,p_quantity,
    v_unit_price,v_total,p_payment_method,'pending'
  )
  returning * into v_order;

  return v_order;
exception
  when unique_violation then
    raise exception 'ID order sudah digunakan';
end;
$$;

revoke all on function public.create_order_secure(text,uuid,text,integer,text) from public;
grant execute on function public.create_order_secure(text,uuid,text,integer,text) to authenticated;

-- 3) Remove direct order insertion by normal users.
-- Orders must be created through create_order_secure().
drop policy if exists orders_insert_own on public.orders;

-- 4) Ensure payment cannot be attached with a mismatched method or forged proof path.
create or replace function public.guard_payment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_uid text := (select auth.uid())::text;
  v_folder text;
  v_ext text;
begin
  select * into v_order
  from public.orders
  where id = new.order_id;

  if not found then
    raise exception 'Order tidak ditemukan';
  end if;

  if v_order.user_id <> (select auth.uid()) then
    raise exception 'Order bukan milik user saat ini';
  end if;

  if new.method <> v_order.payment_method then
    raise exception 'Metode pembayaran tidak cocok dengan order';
  end if;

  if new.status <> 'pending' then
    raise exception 'Payment baru harus pending';
  end if;

  if new.method = 'qris' then
    if new.proof_path is null or new.proof_path = '' then
      raise exception 'Bukti QRIS wajib diupload';
    end if;

    v_folder := split_part(new.proof_path,'/',1);
    v_ext := lower(split_part(new.proof_path,'.',array_length(string_to_array(new.proof_path,'.'),1)));

    if v_folder <> v_uid then
      raise exception 'Path bukti pembayaran tidak valid';
    end if;

    if v_ext not in ('jpg','jpeg','png','webp') then
      raise exception 'Format bukti pembayaran tidak valid';
    end if;
  elsif new.proof_path is not null then
    raise exception 'DANA tidak menggunakan bukti QRIS';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_payment_insert on public.payments;
create trigger guard_payment_insert
before insert on public.payments
for each row execute procedure public.guard_payment_insert();

-- 5) Payment insert policy remains owner-only, but now the trigger validates all fields.
drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
for insert to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.user_id = (select auth.uid())
  )
);

-- 5B) Admin can permanently delete a user Auth account.
-- This deletes auth.users; the related public.profiles row is removed by the FK cascade.
drop function if exists public.admin_delete_user(uuid);
create or replace function public.admin_delete_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_id is null then
    raise exception 'User ID wajib diisi';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Admin yang sedang login tidak dapat dihapus';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin') then
    raise exception 'Akun admin tidak dapat dihapus melalui panel ini';
  end if;

  -- orders memakai ON DELETE RESTRICT, jadi hapus riwayat order user
  -- terlebih dahulu. payments ikut terhapus lewat ON DELETE CASCADE.
  delete from public.orders where user_id = p_user_id;

  delete from auth.users where id = p_user_id;
  return found;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- 6) Prevent a cancelled order from being verified and rewarded.
-- Replace the previous review function with a stricter version.
create or replace function public.admin_review_payment(
  p_payment_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_point_gain bigint := 0;
  v_new_point bigint;
  v_already_awarded boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('verified','rejected') then
    raise exception 'Invalid payment status';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status <> 'pending' then raise exception 'Payment sudah direview sebelumnya'; end if;

  select * into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then raise exception 'Order not found'; end if;

  if v_order.status = 'cancelled' then
    update public.payments
    set status='rejected', reviewed_by=auth.uid(), reviewed_at=now()
    where id=v_payment.id;

    return jsonb_build_object(
      'payment_id',v_payment.id,
      'order_id',v_order.id,
      'payment_status','rejected',
      'order_status','cancelled',
      'point_gain',0,
      'reason','Order sudah dibatalkan'
    );
  end if;

  if p_status = 'rejected' then
    update public.payments
    set status='rejected', reviewed_by=auth.uid(), reviewed_at=now()
    where id=v_payment.id;

    update public.orders
    set status='cancelled', updated_at=now()
    where id=v_order.id;

    return jsonb_build_object(
      'payment_id',v_payment.id,
      'order_id',v_order.id,
      'payment_status','rejected',
      'order_status','cancelled',
      'point_gain',0
    );
  end if;

  update public.payments
  set status='verified', reviewed_by=auth.uid(), reviewed_at=now()
  where id=v_payment.id;

  v_point_gain := floor(v_order.total / 1000);

  select exists (
    select 1 from public.point_ledger
    where order_id=v_order.id
      and delta > 0
      and reason='Payment verified reward'
  ) into v_already_awarded;

  if v_point_gain > 0 and not v_already_awarded then
    update public.profiles
    set point=point+v_point_gain, updated_at=now()
    where id=v_order.user_id
    returning point into v_new_point;

    insert into public.point_ledger(user_id,order_id,delta,reason)
    values(v_order.user_id,v_order.id,v_point_gain,'Payment verified reward');
  else
    select point into v_new_point from public.profiles where id=v_order.user_id;
  end if;

  update public.orders
  set status='processing', updated_at=now()
  where id=v_order.id;

  return jsonb_build_object(
    'payment_id',v_payment.id,
    'order_id',v_order.id,
    'payment_status','verified',
    'order_status','processing',
    'point_gain',case when v_already_awarded then 0 else v_point_gain end,
    'new_point',v_new_point
  );
end;
$$;

revoke all on function public.admin_review_payment(uuid,text) from public;
grant execute on function public.admin_review_payment(uuid,text) to authenticated;

-- 7) Stronger idempotency: only one positive reward ledger row per order.
create unique index if not exists point_ledger_verified_reward_once
on public.point_ledger(order_id)
where delta > 0 and reason = 'Payment verified reward' and order_id is not null;

-- 8) Useful validation constraints for existing tables.
-- Do not add a check on target content because social links/usernames vary by service.
alter table public.orders drop constraint if exists orders_target_not_empty;
alter table public.orders add constraint orders_target_not_empty check (length(btrim(target)) between 3 and 500);

-- 9b) Cleanup helper used only when the browser fails after secure order creation.
create or replace function public.cancel_pending_order(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted boolean := false;
  v_rows integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  delete from public.orders
  where id = p_order_id
    and user_id = auth.uid()
    and status = 'pending'
    and not exists (select 1 from public.payments p where p.order_id = public.orders.id);

  get diagnostics v_rows = row_count;
  v_deleted := v_rows > 0;
  return v_deleted;
end;
$$;

revoke all on function public.cancel_pending_order(text) from public;
grant execute on function public.cancel_pending_order(text) to authenticated;

-- 9) Payment status consistency: reviewed fields must be present after review.
alter table public.payments drop constraint if exists payments_review_fields_check;
alter table public.payments add constraint payments_review_fields_check check (
  (status='pending' and reviewed_by is null and reviewed_at is null)
  or
  (status in ('verified','rejected') and reviewed_by is not null and reviewed_at is not null)
) not valid;


-- ==========================================================
-- 7) PRODUCT DISPLAY ORDER
-- Admin can move products upward within their own category.
-- The order is persisted in PostgreSQL so all users see the same order.
-- ==========================================================
alter table public.products add column if not exists sort_order integer not null default 0;

-- Initialize existing products deterministically by category and creation time.
with ranked as (
  select id,
         row_number() over (partition by category order by created_at asc, id asc) - 1 as new_order
  from public.products
)
update public.products p
set sort_order = ranked.new_order
from ranked
where p.id = ranked.id;

create index if not exists idx_products_category_sort_order
on public.products(category, sort_order, created_at, id);

create or replace function public.move_product_up(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_category text;
  current_order integer;
  previous_id uuid;
  previous_order integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select category, sort_order
    into current_category, current_order
  from public.products
  where id = p_product_id
  for update;

  if current_category is null then
    raise exception 'Product not found';
  end if;

  select id, sort_order
    into previous_id, previous_order
  from public.products
  where category = current_category
    and sort_order < current_order
  order by sort_order desc, created_at desc, id desc
  limit 1
  for update;

  if previous_id is null then
    return;
  end if;

  update public.products
  set sort_order = previous_order
  where id = p_product_id;

  update public.products
  set sort_order = current_order
  where id = previous_id;
end;
$$;

revoke all on function public.move_product_up(uuid) from public;
grant execute on function public.move_product_up(uuid) to authenticated;

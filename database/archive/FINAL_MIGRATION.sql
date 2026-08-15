-- ARCHIVED / DO NOT EXECUTE
-- Historical migration retained for reference only.
-- Use ../00_schema.sql, ../01_security.sql, ../02_admin_setup.sql, ../03_production_hardening.sql instead.

/*
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

-- 2) Make payment review atomic and idempotent.
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

  if not found then
    raise exception 'Payment not found';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment sudah direview sebelumnya';
  end if;

  select * into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if p_status = 'rejected' then
    update public.payments
      set status = 'rejected',
          reviewed_by = auth.uid(),
          reviewed_at = now()
    where id = v_payment.id;

    update public.orders
      set status = 'cancelled',
          updated_at = now()
    where id = v_order.id;

    return jsonb_build_object(
      'payment_id', v_payment.id,
      'order_id', v_order.id,
      'payment_status', 'rejected',
      'order_status', 'cancelled',
      'point_gain', 0
    );
  end if;

  update public.payments
    set status = 'verified',
        reviewed_by = auth.uid(),
        reviewed_at = now()
  where id = v_payment.id;

  -- Point = floor(total / 1000), exactly once per order.
  v_point_gain := floor(v_order.total / 1000);

  select exists (
    select 1
    from public.point_ledger
    where order_id = v_order.id
      and delta > 0
      and reason = 'Payment verified reward'
  ) into v_already_awarded;

  if v_point_gain > 0 and not v_already_awarded then
    update public.profiles
      set point = point + v_point_gain,
          updated_at = now()
    where id = v_order.user_id
    returning point into v_new_point;

    insert into public.point_ledger(user_id, order_id, delta, reason)
    values (v_order.user_id, v_order.id, v_point_gain, 'Payment verified reward');
  else
    select point into v_new_point from public.profiles where id = v_order.user_id;
  end if;

  update public.orders
    set status = case when status = 'cancelled' then 'cancelled' else 'processing' end,
        updated_at = now()
  where id = v_order.id;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'order_id', v_order.id,
    'payment_status', 'verified',
    'order_status', case when v_order.status = 'cancelled' then 'cancelled' else 'processing' end,
    'point_gain', case when v_already_awarded then 0 else v_point_gain end,
    'new_point', v_new_point
  );
end;
$$;

revoke all on function public.admin_review_payment(uuid,text) from public;
grant execute on function public.admin_review_payment(uuid,text) to authenticated;

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

*/

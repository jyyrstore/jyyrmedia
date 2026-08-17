-- JYYR STORE V4 — SAFE SPLIT MIGRATION
-- Generated against the live JYYR core schema discovered during this session.
-- Run in numeric order, one file at a time. Stop on first error.
-- No external API is required.

BEGIN;

-- =========================================================
-- AUDIT HELPERS / WRITER ROLE
-- =========================================================
create or replace function public.is_admin_writer()
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where id=(select auth.uid())
      and role='admin'
      and admin_level <> 'readonly'
  );
$$;

create or replace function public.audit(
  p_action text, p_target_type text default '', p_target_id text default null, p_details jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.admin_audit_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),p_action,p_target_type,p_target_id,coalesce(p_details,'{}'::jsonb));
end $$;

revoke all on function public.audit(text,text,text,jsonb) from public;
grant execute on function public.audit(text,text,text,jsonb) to authenticated;
-- =========================================================
-- SECURE WALLET / DEPOSIT / REFUND
-- =========================================================
create or replace function public.create_wallet_deposit(
  p_amount numeric, p_method text, p_proof_path text
) returns public.wallet_deposits
language plpgsql security definer set search_path=public as $$
declare v public.wallet_deposits%rowtype; s public.store_settings%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into s from public.store_settings where id=true;
  if p_amount < s.min_deposit then raise exception 'Minimum deposit Rp %',s.min_deposit; end if;
  if p_amount > s.max_deposit then raise exception 'Maksimum deposit Rp %',s.max_deposit; end if;
  if p_method not in('dana','qris') then raise exception 'Metode deposit tidak valid'; end if;
  if nullif(p_proof_path,'') is null then raise exception 'Bukti deposit wajib diupload'; end if;
  insert into public.wallet_deposits(user_id,amount,method,proof_path)
  values(auth.uid(),p_amount,p_method,nullif(p_proof_path,''))
  returning * into v;
  return v;
end $$;

create or replace function public.admin_review_deposit(p_id uuid,p_status text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.wallet_deposits%rowtype; s public.store_settings%rowtype; b numeric(14,2); total numeric(14,2);
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  select * into d from public.wallet_deposits where id=p_id for update;
  if not found then raise exception 'Deposit tidak ditemukan'; end if;
  if d.status<>'pending' then raise exception 'Deposit sudah direview'; end if;
  if p_status not in('verified','rejected') then raise exception 'Status tidak valid'; end if;
  if p_status='rejected' then
    update public.wallet_deposits set status='rejected',reject_reason=nullif(trim(p_reason),''),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
    perform public.audit('Reject deposit','deposit',p_id::text,jsonb_build_object('reason',p_reason));
    return jsonb_build_object('status','rejected');
  end if;
  select * into s from public.store_settings where id=true for update;
  total := d.amount + round(d.amount*s.deposit_bonus_percent/100 + s.deposit_bonus_fixed,2);
  update public.profiles set saldo=saldo+total,updated_at=now()
    where id=d.user_id and saldo+total<=s.max_balance returning saldo into b;
  if not found then raise exception 'Saldo melebihi batas maksimum'; end if;
  update public.wallet_deposits set status='verified',bonus=total-d.amount,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
  insert into public.balance_ledger(user_id,delta,balance_after,reason,created_by)
  values(d.user_id,total,b,'Deposit verified + bonus',auth.uid());
  insert into public.notifications(user_id,title,message,type,created_by)
  values(d.user_id,'Deposit berhasil','Saldo Rp '||to_char(total,'FM999G999G999D00')||' telah masuk.','wallet',auth.uid());
  perform public.audit('Verify deposit','deposit',p_id::text,jsonb_build_object('amount',d.amount,'bonus',total-d.amount));
  return jsonb_build_object('status','verified','credited',total,'bonus',total-d.amount,'balance_after',b);
end $$;

create or replace function public.create_balance_order(
  p_order_id text,p_product_id uuid,p_target text,p_quantity integer
) returns public.orders
language plpgsql security definer set search_path=public as $$
declare p public.products%rowtype; l public.levels%rowtype; o public.orders%rowtype;
v_total numeric(14,2); v_discount numeric(14,2); v_balance numeric(14,2); v_point bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where id=auth.uid() and account_status<>'active') then raise exception 'Akun sedang tidak aktif'; end if;
  if exists(select 1 from public.store_settings where id=true and (not store_open or maintenance_mode or kill_switch)) then raise exception 'Store sedang tidak menerima order'; end if;
  select * into p from public.products where id=p_product_id and active=true and product_status='published'
    and (scheduled_at is null or scheduled_at<=now()) and (scheduled_until is null or scheduled_until>now()) for share;
  if not found then raise exception 'Produk tidak tersedia'; end if;
  if p_quantity<p.min_quantity or p_quantity>p.max_quantity then raise exception 'Jumlah order di luar batas'; end if;
  select * into l from public.levels where min_point <= (select point from public.profiles where id=auth.uid())
    order by min_point desc limit 1;
  v_discount:=coalesce(l.discount_percent,0);
  v_total:=round(p.price*p_quantity*(1-v_discount/100),2);
  update public.profiles set saldo=saldo-v_total,updated_at=now()
    where id=auth.uid() and saldo>=v_total returning saldo into v_balance;
  if not found then raise exception 'Saldo tidak cukup'; end if;
  insert into public.orders(id,user_id,product_id,product_name,target,quantity,unit_price,total,payment_method,status)
  values(p_order_id,auth.uid(),p.id,p.name,trim(p_target),p_quantity,p.price,v_total,'balance','pending') returning * into o;
  insert into public.payments(order_id,method,status,reviewed_by,reviewed_at) values(o.id,'balance','verified',auth.uid(),now());
  update public.orders set status='processing',updated_at=now() where id=o.id returning * into o;
  insert into public.balance_ledger(user_id,delta,balance_after,reason,created_by)
  values(auth.uid(),-v_total,v_balance,'Pembelian menggunakan saldo',auth.uid());
  insert into public.order_events(order_id,status,note,created_by) values(o.id,'processing','Dibayar dengan saldo',auth.uid());
  return o;
end $$;

create or replace function public.admin_refund_order(p_order_id text,p_amount numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; s public.store_settings%rowtype; b numeric;
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order tidak ditemukan'; end if;
  if p_amount<=0 or p_amount>o.total then raise exception 'Nominal refund tidak valid'; end if;
  if exists(select 1 from public.refunds where order_id=o.id) then raise exception 'Order sudah direfund'; end if;
  select * into s from public.store_settings where id=true;
  update public.profiles set saldo=saldo+p_amount,updated_at=now()
    where id=o.user_id and saldo+p_amount<=s.max_balance returning saldo into b;
  if not found then raise exception 'Saldo user melebihi batas maksimum'; end if;
  insert into public.refunds(order_id,user_id,amount,reason,created_by) values(o.id,o.user_id,p_amount,p_reason,auth.uid());
  insert into public.balance_ledger(user_id,delta,balance_after,reason,created_by)
  values(o.user_id,p_amount,b,'Refund order '||o.id,auth.uid());
  update public.orders set status='cancelled',cancel_reason=p_reason,updated_at=now() where id=o.id;
  insert into public.order_events(order_id,status,note,created_by) values(o.id,'cancelled','Refund: '||p_reason,auth.uid());
  insert into public.notifications(user_id,title,message,type,created_by)
  values(o.user_id,'Refund berhasil','Saldo refund Rp '||p_amount||' telah dikembalikan.','refund',auth.uid());
  perform public.audit('Refund order','order',o.id,jsonb_build_object('amount',p_amount,'reason',p_reason));
  return jsonb_build_object('refunded',p_amount,'balance_after',b);
end $$;

-- Override secure normal order creation so wallet/level/store guards apply.
create or replace function public.create_order_secure(
  p_order_id text,p_product_id uuid,p_target text,p_quantity integer,p_payment_method text
) returns public.orders
language plpgsql security definer set search_path=public as $$
declare p public.products%rowtype; o public.orders%rowtype; l public.levels%rowtype;
v_total numeric(14,2); v_uid uuid:=auth.uid(); s public.store_settings%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where id=v_uid and account_status<>'active') then raise exception 'Akun sedang tidak aktif'; end if;
  select * into s from public.store_settings where id=true;
  if not s.store_open or s.maintenance_mode or s.kill_switch then raise exception 'Store sedang tidak menerima order'; end if;
  if p_payment_method not in('dana','qris') then raise exception 'Metode pembayaran tidak valid'; end if;
  select * into p from public.products where id=p_product_id and active=true and product_status='published'
    and (scheduled_at is null or scheduled_at<=now()) and (scheduled_until is null or scheduled_until>now()) for share;
  if not found then raise exception 'Produk tidak tersedia'; end if;
  if p_quantity<p.min_quantity or p_quantity>p.max_quantity then raise exception 'Jumlah order di luar batas'; end if;
  select * into l from public.levels where min_point <= (select point from public.profiles where id=v_uid) order by min_point desc limit 1;
  v_total:=round(p.price*p_quantity*(1-coalesce(l.discount_percent,0)/100),2);
  insert into public.orders(id,user_id,product_id,product_name,target,quantity,unit_price,total,payment_method,status)
  values(trim(p_order_id),v_uid,p.id,p.name,trim(p_target),p_quantity,p.price,v_total,p_payment_method,'pending') returning * into o;
  return o;
exception when unique_violation then raise exception 'ID order sudah digunakan'; end $$;

COMMIT;

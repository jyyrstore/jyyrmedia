-- JYYR STORE V4 — SAFE SPLIT MIGRATION
-- Generated against the live JYYR core schema discovered during this session.
-- Run in numeric order, one file at a time. Stop on first error.
-- No external API is required.

BEGIN;

-- =========================================================
-- Important: user verification / login activity do not expose auth.users.
-- =========================================================

-- Writer-aware wrappers for existing admin RPCs.
create or replace function public.admin_review_payment(p_payment_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_payment public.payments%rowtype; v_order public.orders%rowtype; gain bigint; already boolean; newp bigint;
begin
 if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
 if p_status not in('verified','rejected') then raise exception 'Invalid payment status'; end if;
 select * into v_payment from public.payments where id=p_payment_id for update;
 if not found or v_payment.status<>'pending' then raise exception 'Payment tidak tersedia untuk direview'; end if;
 select * into v_order from public.orders where id=v_payment.order_id for update;
 if p_status='rejected' then
   update public.payments set status='rejected',reviewed_by=auth.uid(),reviewed_at=now() where id=p_payment_id;
   update public.orders set status='cancelled',reject_reason='Payment rejected',updated_at=now() where id=v_order.id;
   insert into public.notifications(user_id,title,message,type,created_by) values(v_order.user_id,'Pembayaran ditolak','Pembayaran untuk order '||v_order.id||' ditolak.','payment',auth.uid());
   perform public.audit('Reject payment','payment',p_payment_id::text);
   return jsonb_build_object('status','rejected','order_id',v_order.id);
 end if;
 update public.payments set status='verified',reviewed_by=auth.uid(),reviewed_at=now() where id=p_payment_id;
 gain:=floor(v_order.total/1000);
 select exists(select 1 from public.point_ledger where order_id=v_order.id and delta>0 and reason='Payment verified reward') into already;
 if gain>0 and not already then
   update public.profiles set point=point+gain,updated_at=now() where id=v_order.user_id returning point into newp;
   insert into public.point_ledger(user_id,order_id,delta,reason) values(v_order.user_id,v_order.id,gain,'Payment verified reward');
 else select point into newp from public.profiles where id=v_order.user_id; end if;
 update public.orders set status='processing',updated_at=now() where id=v_order.id and status<>'cancelled';
 insert into public.notifications(user_id,title,message,type,created_by) values(v_order.user_id,'Pembayaran diverifikasi','Order '||v_order.id||' sudah diproses.','payment',auth.uid());
 perform public.audit('Verify payment','payment',p_payment_id::text,jsonb_build_object('point_gain',case when already then 0 else gain end));
 return jsonb_build_object('status','verified','order_id',v_order.id,'point_gain',case when already then 0 else gain end,'new_point',newp);
end $$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
 if p_user_id is null or p_user_id=auth.uid() then raise exception 'User ID tidak valid'; end if;
 if exists(select 1 from public.profiles where id=p_user_id and role='admin') then raise exception 'Akun admin tidak dapat dihapus'; end if;
 delete from public.orders where user_id=p_user_id;
 delete from auth.users where id=p_user_id;
 perform public.audit('Delete user','user',p_user_id::text);
 return found;
end $$;

create or replace function public.move_product_up(p_product_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare c text; cur integer; pid uuid; prev integer;
begin
 if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
 select category,sort_order into c,cur from public.products where id=p_product_id for update;
 if c is null then raise exception 'Product not found'; end if;
 select id,sort_order into pid,prev from public.products where category=c and sort_order<cur order by sort_order desc,created_at desc limit 1 for update;
 if pid is null then return; end if;
 update public.products set sort_order=prev where id=p_product_id;
 update public.products set sort_order=cur where id=pid;
 perform public.audit('Move product','product',p_product_id::text);
end $$;

create or replace function public.admin_set_admin_level(p_user_id uuid,p_level text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and admin_level='super_admin') then
   raise exception 'Super Admin access required';
 end if;
 if p_level not in('super_admin','admin','readonly') then raise exception 'Level tidak valid'; end if;
 if p_user_id=auth.uid() and p_level<>'super_admin' then raise exception 'Super Admin tidak boleh menurunkan dirinya sendiri'; end if;
 update public.profiles set admin_level=p_level,updated_at=now() where id=p_user_id and role='admin';
 if not found then raise exception 'Admin tidak ditemukan'; end if;
 perform public.audit('Change admin permission','admin',p_user_id::text,jsonb_build_object('level',p_level));
 return true;
end $$;

drop policy if exists products_select on public.products;
drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated
using (
  (active=true and product_status='published'
   and (scheduled_at is null or scheduled_at<=now())
   and (scheduled_until is null or scheduled_until>now()))
  or public.is_admin()
);

create or replace function public.audit_admin_mutation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.is_admin() and auth.uid() is not null then
    insert into public.admin_audit_logs(admin_id,action,target_type,target_id,details)
    values(auth.uid(),tg_op||' '||tg_table_name,tg_table_name,
      case when tg_table_name='orders' then coalesce(new.id::text,old.id::text)
           when tg_table_name='profiles' then coalesce(new.id::text,old.id::text)
           when tg_table_name='products' then coalesce(new.id::text,old.id::text)
           when tg_table_name='levels' then coalesce(new.id::text,old.id::text)
           else null end,
      jsonb_build_object('table',tg_table_name));
  end if;
  return coalesce(new,old);
end $$;
drop trigger if exists audit_products on public.products;
drop trigger if exists audit_products on public.products;
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_admin_mutation();
drop trigger if exists audit_levels on public.levels;
drop trigger if exists audit_levels on public.levels;
create trigger audit_levels after insert or update or delete on public.levels for each row execute function public.audit_admin_mutation();
drop trigger if exists audit_orders on public.orders;
drop trigger if exists audit_orders on public.orders;
create trigger audit_orders after insert or update or delete on public.orders for each row execute function public.audit_admin_mutation();

create table if not exists public.vouchers (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 discount_percent numeric(5,2) not null default 0 check(discount_percent between 0 and 100),
 discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
 usage_limit integer,
 used_count integer not null default 0 check(used_count>=0),
 expires_at timestamptz,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.vouchers enable row level security;
drop policy if exists vouchers_admin on public.vouchers;
drop policy if exists vouchers_admin on public.vouchers;
create policy vouchers_admin on public.vouchers for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());

create or replace function public.get_public_leaderboard(p_limit integer default 20)
returns table(username text, point bigint, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.username,p.point,p.created_at from public.profiles p
  where p.role='user' and p.account_status='active'
  order by p.point desc,p.created_at asc
  limit greatest(1,least(coalesce(p_limit,20),100));
$$;
revoke all on function public.get_public_leaderboard(integer) from public;
grant execute on function public.get_public_leaderboard(integer) to authenticated;

create or replace function public.guard_payment_insert()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_uid text:=(select auth.uid())::text; v_folder text; v_ext text;
begin
 select * into v_order from public.orders where id=new.order_id;
 if not found then raise exception 'Order tidak ditemukan'; end if;
 if v_order.user_id<>auth.uid() and not public.is_admin_writer() then raise exception 'Order bukan milik user saat ini'; end if;
 if new.method<>v_order.payment_method then raise exception 'Metode pembayaran tidak cocok'; end if;
 if new.method='balance' then
   if new.status<>'verified' then raise exception 'Pembayaran saldo harus verified'; end if;
   if new.reviewed_by is null then new.reviewed_by:=auth.uid(); end if;
   if new.reviewed_at is null then new.reviewed_at:=now(); end if;
   return new;
 end if;
 if new.status<>'pending' then raise exception 'Payment baru harus pending'; end if;
 if new.method='qris' or new.method='dana' then
   if new.method='qris' and nullif(new.proof_path,'') is null then raise exception 'Bukti QRIS wajib diupload'; end if;
   if new.method='qris' then
     v_folder:=split_part(new.proof_path,'/',1);
     v_ext:=lower(split_part(new.proof_path,'.',array_length(string_to_array(new.proof_path,'.'),1)));
     if v_folder<>v_uid then raise exception 'Path bukti tidak valid'; end if;
     if v_ext not in('jpg','jpeg','png','webp') then raise exception 'Format bukti tidak valid'; end if;
   elsif new.proof_path is not null then
     raise exception 'DANA tidak menggunakan bukti QRIS';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists guard_payment_insert on public.payments;
drop trigger if exists guard_payment_insert on public.payments;
create trigger guard_payment_insert before insert on public.payments for each row execute function public.guard_payment_insert();

COMMIT;

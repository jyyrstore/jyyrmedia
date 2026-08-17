-- JYYR STORE V4 — SAFE SPLIT MIGRATION
-- Generated against the live JYYR core schema discovered during this session.
-- Run in numeric order, one file at a time. Stop on first error.
-- No external API is required.

BEGIN;

-- =========================================================
-- Writer-aware RPCs
-- =========================================================
create or replace function public.admin_adjust_balance(p_user_id uuid,p_delta numeric,p_reason text default 'Manual admin balance adjustment')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v numeric; s public.store_settings%rowtype;
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  select * into s from public.store_settings where id=true;
  update public.profiles set saldo=saldo+p_delta,updated_at=now()
    where id=p_user_id and saldo+p_delta>=0 and saldo+p_delta<=s.max_balance returning saldo into v;
  if not found then raise exception 'User tidak ditemukan atau batas saldo terlampaui'; end if;
  insert into public.balance_ledger(user_id,delta,balance_after,reason,created_by) values(p_user_id,p_delta,v,p_reason,auth.uid());
  perform public.audit('Adjust balance','user',p_user_id::text,jsonb_build_object('delta',p_delta,'reason',p_reason));
  return jsonb_build_object('new_saldo',v);
end $$;

create or replace function public.admin_adjust_point(p_user_id uuid,p_delta bigint,p_reason text default 'Manual admin adjustment')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v bigint;
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  update public.profiles set point=point+p_delta,updated_at=now()
    where id=p_user_id and point+p_delta>=0 returning point into v;
  if not found then raise exception 'User tidak ditemukan atau point tidak valid'; end if;
  insert into public.point_ledger(user_id,delta,reason) values(p_user_id,p_delta,p_reason);
  perform public.audit('Adjust point','user',p_user_id::text,jsonb_build_object('delta',p_delta,'reason',p_reason));
  return jsonb_build_object('new_point',v);
end $$;

-- User status / profile admin controls.
create or replace function public.admin_set_user_status(p_user_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  if p_status not in('active','suspended','banned') then raise exception 'Status tidak valid'; end if;
  update public.profiles set account_status=p_status,updated_at=now() where id=p_user_id and role='user';
  if not found then raise exception 'User tidak ditemukan'; end if;
  perform public.audit('Set user status','user',p_user_id::text,jsonb_build_object('status',p_status));
  return true;
end $$;

create or replace function public.admin_verify_user(p_user_id uuid,p_verified boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  update public.profiles set verified=p_verified,updated_at=now() where id=p_user_id and role='user';
  if not found then raise exception 'User tidak ditemukan'; end if;
  return true;
end $$;

create or replace function public.admin_update_user_profile(p_user_id uuid,p_name text,p_username text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  update public.profiles set full_name=trim(p_name),username=lower(trim(p_username)),updated_at=now()
    where id=p_user_id and role='user';
  if not found then raise exception 'User tidak ditemukan'; end if;
  perform public.audit('Edit user profile','user',p_user_id::text);
  return true;
end $$;

-- Store setting update helper.
create or replace function public.admin_update_store_settings(
  p_min_deposit numeric,p_max_deposit numeric,p_max_balance numeric,
  p_bonus_percent numeric,p_bonus_fixed numeric,p_store_open boolean,
  p_maintenance boolean,p_kill_switch boolean,p_message text,p_announcement text
) returns public.store_settings language plpgsql security definer set search_path=public as $$
declare v public.store_settings%rowtype;
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  if p_min_deposit<0 or p_max_deposit<p_min_deposit or p_max_balance<0 then raise exception 'Batas wallet tidak valid'; end if;
  update public.store_settings set min_deposit=p_min_deposit,max_deposit=p_max_deposit,max_balance=p_max_balance,
    deposit_bonus_percent=p_bonus_percent,deposit_bonus_fixed=p_bonus_fixed,store_open=p_store_open,
    maintenance_mode=p_maintenance,kill_switch=p_kill_switch,maintenance_message=coalesce(p_message,''),
    system_announcement=coalesce(p_announcement,''),updated_at=now() where id=true returning * into v;
  perform public.audit('Update store settings','system',null,to_jsonb(v));
  return v;
end $$;

-- Bulk order state changes.
create or replace function public.admin_bulk_order_status(p_ids text[],p_status text,p_reason text default null)
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  if not public.is_admin_writer() then raise exception 'Admin writer access required'; end if;
  if p_status not in('processing','success','cancelled','failed') then raise exception 'Status tidak valid'; end if;
  update public.orders set status=p_status,
    cancel_reason=case when p_status='cancelled' then nullif(p_reason,'') else cancel_reason end,
    reject_reason=case when p_status='failed' then nullif(p_reason,'') else reject_reason end,
    updated_at=now() where id=any(p_ids);
  get diagnostics n=row_count;
  perform public.audit('Bulk order status','order',null,jsonb_build_object('count',n,'status',p_status));
  return n;
end $$;

-- Notification mark-read.
create or replace function public.mark_notification_read(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.notifications set read_at=now() where id=p_id and user_id=auth.uid();
  return found;
end $$;

COMMIT;

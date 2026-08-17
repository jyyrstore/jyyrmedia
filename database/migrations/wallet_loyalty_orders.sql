-- JYYR STORE V4 — SAFE SPLIT MIGRATION
-- Generated against the live JYYR core schema discovered during this session.
-- Run in numeric order, one file at a time. Stop on first error.
-- No external API is required.

BEGIN;

-- =========================================================
-- LEVEL REWARDS / MILESTONES
-- =========================================================
create or replace function public.apply_point_rewards()
returns trigger language plpgsql security definer set search_path=public as $$
declare l record; m record; r numeric; b numeric; newbal numeric;
begin
  if new.point=old.point then return new; end if;
  for l in select * from public.levels where min_point<=new.point order by min_point loop
    if l.reward>0 and not exists(select 1 from public.level_rewards_awarded where user_id=new.id and level_id=l.id) then
      if exists(select 1 from public.store_settings s where s.id=true and (select saldo from public.profiles where id=new.id)+l.reward>s.max_balance) then
        continue;
      end if;
      update public.profiles set saldo=saldo+l.reward where id=new.id returning saldo into newbal;
      insert into public.level_rewards_awarded(user_id,level_id,reward) values(new.id,l.id,l.reward);
      insert into public.balance_ledger(user_id,delta,balance_after,reason) values(new.id,l.reward,newbal,'Reward level '||l.name);
    end if;
    if l.point_bonus>0 then
      insert into public.point_ledger(user_id,delta,reason) values(new.id,l.point_bonus,'Bonus point level '||l.name);
    end if;
  end loop;
  for m in select * from public.point_milestones where active and m.threshold<=new.point loop
    if m.bonus_point>0 and not exists(select 1 from public.point_ledger where user_id=new.id and reason='Milestone '||m.threshold||' point bonus') then
      insert into public.point_ledger(user_id,delta,reason) values(new.id,m.bonus_point,'Milestone '||m.threshold||' point bonus');
      update public.profiles set point=point+m.bonus_point where id=new.id;
    end if;
    if m.bonus_balance>0 then
      select saldo into newbal from public.profiles where id=new.id;
      if not exists(select 1 from public.balance_ledger where user_id=new.id and reason='Milestone '||m.threshold||' saldo bonus')
         and not exists(select 1 from public.store_settings s where s.id=true and newbal+m.bonus_balance>s.max_balance) then
        update public.profiles set saldo=saldo+m.bonus_balance returning saldo into newbal;
        insert into public.balance_ledger(user_id,delta,balance_after,reason) values(new.id,m.bonus_balance,newbal,'Milestone '||m.threshold||' saldo bonus');
      end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists profile_point_rewards on public.profiles;
drop trigger if exists profile_point_rewards on public.profiles;
create trigger profile_point_rewards after update of point on public.profiles
for each row execute function public.apply_point_rewards();
-- =========================================================
-- ORDER EVENTS
-- =========================================================
create or replace function public.log_order_event()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.order_events(order_id,status,note) values(new.id,new.status,'Order dibuat');
  elsif new.status is distinct from old.status then
    insert into public.order_events(order_id,status,note,created_by) values(new.id,new.status,'Status berubah',auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists orders_event_log on public.orders;
drop trigger if exists orders_event_log on public.orders;
create trigger orders_event_log after insert or update of status on public.orders
for each row execute function public.log_order_event();


create or replace function public.expire_points_for_user()
returns bigint language plpgsql security definer set search_path=public as $$
declare v bigint:=0; r record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  for r in
    select l.id,l.delta
    from public.point_ledger l
    where l.user_id=auth.uid() and l.delta>0 and l.expires_at is not null and l.expires_at<=now()
      and not exists(select 1 from public.point_ledger x where x.reason='Expiration of point ledger #'||l.id)
  loop
    insert into public.point_ledger(user_id,delta,reason) values(auth.uid(),-r.delta,'Expiration of point ledger #'||r.id);
    v:=v+r.delta;
  end loop;
  if v>0 then
    update public.profiles set point=greatest(0,point-v),updated_at=now() where id=auth.uid();
  end if;
  return v;
end $$;
revoke all on function public.expire_points_for_user() from public;
grant execute on function public.expire_points_for_user() to authenticated;


create or replace function public.notify_order_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into public.notifications(user_id,title,message,type)
    values(new.user_id,'Pesanan '||new.status,'Pesanan '||new.id||' sekarang berstatus '||new.status||'.','order');
  end if;
  return new;
end $$;
drop trigger if exists orders_notification on public.orders;
drop trigger if exists orders_notification on public.orders;
create trigger orders_notification after insert or update of status on public.orders
for each row execute function public.notify_order_change();

-- =========================================================
-- =========================================================
alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.wallet_deposits enable row level security;
alter table public.refunds enable row level security;
alter table public.notifications enable row level security;
alter table public.user_notes enable row level security;
alter table public.order_events enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.login_activity enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.faq_items enable row level security;
alter table public.help_articles enable row level security;
alter table public.level_rewards_awarded enable row level security;
alter table public.point_milestones enable row level security;
alter table public.point_expiry_settings enable row level security;

-- Helper to replace the most important admin write policies with writer-aware checks.
drop policy if exists store_settings_select_auth on public.store_settings;
drop policy if exists store_settings_select_auth on public.store_settings;
create policy store_settings_select_auth on public.store_settings for select to authenticated using(true);
drop policy if exists store_settings_admin_write on public.store_settings;
drop policy if exists store_settings_admin_write on public.store_settings;
create policy store_settings_admin_write on public.store_settings for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());

drop policy if exists categories_select_auth on public.categories;
drop policy if exists categories_select_auth on public.categories;
create policy categories_select_auth on public.categories for select to authenticated using(active or public.is_admin());
drop policy if exists categories_admin_write on public.categories;
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());

drop policy if exists wallet_deposits_own_or_admin on public.wallet_deposits;
drop policy if exists wallet_deposits_own_or_admin on public.wallet_deposits;
create policy wallet_deposits_own_or_admin on public.wallet_deposits for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists wallet_deposits_insert_own on public.wallet_deposits;
drop policy if exists wallet_deposits_insert_own on public.wallet_deposits;
create policy wallet_deposits_insert_own on public.wallet_deposits for insert to authenticated with check(user_id=auth.uid());
drop policy if exists refunds_select_own_or_admin on public.refunds;
drop policy if exists refunds_select_own_or_admin on public.refunds;
create policy refunds_select_own_or_admin on public.refunds for select to authenticated using(user_id=auth.uid() or public.is_admin());

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using(user_id=auth.uid() or user_id is null or public.is_admin());
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
drop policy if exists notifications_admin_insert on public.notifications;
drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert on public.notifications for insert to authenticated with check(public.is_admin_writer());

drop policy if exists user_notes_admin on public.user_notes;
drop policy if exists user_notes_admin on public.user_notes;
create policy user_notes_admin on public.user_notes for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());

drop policy if exists order_events_select on public.order_events;
drop policy if exists order_events_select on public.order_events;
create policy order_events_select on public.order_events for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
drop policy if exists order_events_admin_insert on public.order_events;
drop policy if exists order_events_admin_insert on public.order_events;
create policy order_events_admin_insert on public.order_events for insert to authenticated with check(public.is_admin_writer());

drop policy if exists admin_audit_admin on public.admin_audit_logs;
drop policy if exists admin_audit_admin on public.admin_audit_logs;
create policy admin_audit_admin on public.admin_audit_logs for select to authenticated using(public.is_admin());
drop policy if exists login_activity_own_or_admin on public.login_activity;
drop policy if exists login_activity_own_or_admin on public.login_activity;
create policy login_activity_own_or_admin on public.login_activity for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists login_activity_insert_own on public.login_activity;
drop policy if exists login_activity_insert_own on public.login_activity;
create policy login_activity_insert_own on public.login_activity for insert to authenticated with check(user_id=auth.uid());
drop policy if exists login_activity_failed_anon on public.login_activity;
drop policy if exists login_activity_failed_anon on public.login_activity;
create policy login_activity_failed_anon on public.login_activity for insert to anon with check(user_id is null and event='failed_login');

drop policy if exists support_select on public.support_tickets;
drop policy if exists support_select on public.support_tickets;
create policy support_select on public.support_tickets for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists support_insert on public.support_tickets;
drop policy if exists support_insert on public.support_tickets;
create policy support_insert on public.support_tickets for insert to authenticated with check(user_id=auth.uid());
drop policy if exists support_update on public.support_tickets;
drop policy if exists support_update on public.support_tickets;
create policy support_update on public.support_tickets for update to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
drop policy if exists ticket_messages_select on public.ticket_messages;
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages for select to authenticated using(
  exists(select 1 from public.support_tickets t where t.id=ticket_id and
    ((t.user_id=auth.uid() and internal=false) or public.is_admin()))
);
drop policy if exists ticket_messages_insert on public.ticket_messages;
drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages for insert to authenticated with check(sender_id=auth.uid() and (exists(select 1 from public.support_tickets t where t.id=ticket_id and (t.user_id=auth.uid() or public.is_admin()))));

drop policy if exists faq_select on public.faq_items;
drop policy if exists faq_select on public.faq_items;
create policy faq_select on public.faq_items for select to authenticated using(active or public.is_admin());
drop policy if exists faq_admin on public.faq_items;
drop policy if exists faq_admin on public.faq_items;
create policy faq_admin on public.faq_items for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());
drop policy if exists help_select on public.help_articles;
drop policy if exists help_select on public.help_articles;
create policy help_select on public.help_articles for select to authenticated using(active or public.is_admin());
drop policy if exists help_admin on public.help_articles;
drop policy if exists help_admin on public.help_articles;
create policy help_admin on public.help_articles for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());

drop policy if exists milestones_admin on public.point_milestones;
drop policy if exists milestones_admin on public.point_milestones;
create policy milestones_admin on public.point_milestones for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());
drop policy if exists expiry_admin on public.point_expiry_settings;
drop policy if exists expiry_admin on public.point_expiry_settings;
create policy expiry_admin on public.point_expiry_settings for all to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());
drop policy if exists level_rewards_select on public.level_rewards_awarded;
drop policy if exists level_rewards_select on public.level_rewards_awarded;
create policy level_rewards_select on public.level_rewards_awarded for select to authenticated using(user_id=auth.uid() or public.is_admin());
-- =========================================================
-- Secure profile self-service: only status stays admin-controlled.
-- =========================================================
drop policy if exists profiles_update_admin_only on public.profiles;
drop policy if exists profiles_update_own_safe on public.profiles;
create or replace function public.guard_profile_self_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid()=old.id and not public.is_admin_writer() then
    if new.role<>old.role or new.account_status<>old.account_status or new.verified<>old.verified
       or new.saldo<>old.saldo or new.point<>old.point or new.admin_level<>old.admin_level then
      raise exception 'Field profil sensitif hanya dapat diubah admin';
    end if;
  end if;
  if old.role='admin' and (new.role<>old.role or new.admin_level<>old.admin_level)
     and not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and admin_level='super_admin') then
    raise exception 'Hanya Super Admin yang dapat mengubah permission admin';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_self_update on public.profiles;
drop trigger if exists guard_profile_self_update on public.profiles;
create trigger guard_profile_self_update before update on public.profiles
for each row execute function public.guard_profile_self_update();
drop policy if exists profiles_update_own_safe on public.profiles;
create policy profiles_update_own_safe on public.profiles
for update to authenticated
using(id=auth.uid() or public.is_admin_writer())
with check(id=auth.uid() or public.is_admin_writer());

-- Writer-aware products/levels/orders policies.
drop policy if exists products_admin_insert on public.products;
drop policy if exists products_admin_update on public.products;
drop policy if exists products_admin_delete on public.products;
drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products for insert to authenticated with check(public.is_admin_writer());
drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products for update to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());
drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products for delete to authenticated using(public.is_admin_writer());

drop policy if exists levels_admin_insert on public.levels;
drop policy if exists levels_admin_update on public.levels;
drop policy if exists levels_admin_delete on public.levels;
drop policy if exists levels_admin_insert on public.levels;
create policy levels_admin_insert on public.levels for insert to authenticated with check(public.is_admin_writer());
drop policy if exists levels_admin_update on public.levels;
create policy levels_admin_update on public.levels for update to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());
drop policy if exists levels_admin_delete on public.levels;
create policy levels_admin_delete on public.levels for delete to authenticated using(public.is_admin_writer());

drop policy if exists broadcasts_admin_insert on public.broadcasts;
drop policy if exists broadcasts_admin_delete on public.broadcasts;
drop policy if exists broadcasts_admin_insert on public.broadcasts;
create policy broadcasts_admin_insert on public.broadcasts for insert to authenticated with check(public.is_admin_writer() and created_by=auth.uid());
drop policy if exists broadcasts_admin_delete on public.broadcasts;
create policy broadcasts_admin_delete on public.broadcasts for delete to authenticated using(public.is_admin_writer());

drop policy if exists orders_admin_update on public.orders;
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders for update to authenticated using(public.is_admin_writer()) with check(public.is_admin_writer());

-- block direct client balance/point mutation through ledgers
drop policy if exists point_ledger_admin_insert on public.point_ledger;
drop policy if exists point_ledger_admin_insert on public.point_ledger;
create policy point_ledger_admin_insert on public.point_ledger for insert to authenticated with check(false);
drop policy if exists balance_ledger_admin_insert on public.balance_ledger;
drop policy if exists balance_ledger_admin_insert on public.balance_ledger;
create policy balance_ledger_admin_insert on public.balance_ledger for insert to authenticated with check(false);

COMMIT;

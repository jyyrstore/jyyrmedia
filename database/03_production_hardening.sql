-- JYYR STORE — Production Hardening
-- Run AFTER 00_schema.sql and 01_security.sql.
-- This migration does not change the visual frontend.

-- Payment mutations from the browser are intentionally blocked.
drop policy if exists payments_admin_update on public.payments;

-- Idempotent reward protection.
create unique index if not exists point_ledger_verified_reward_once
on public.point_ledger(order_id)
where delta > 0 and reason = 'Payment verified reward' and order_id is not null;

-- Faster production queues.
create index if not exists idx_payments_status_created_at
on public.payments(status, created_at desc);

create index if not exists idx_orders_status_created_at
on public.orders(status, created_at desc);

-- Keep proof storage private.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

-- Guard order state transitions.
create or replace function public.guard_order_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('processing','success') and not exists (
    select 1 from public.payments p
    where p.order_id = new.id and p.status = 'verified'
  ) then
    raise exception 'Payment must be verified before order can be processing/success';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_order_payment_status on public.orders;
create trigger guard_order_payment_status
before update of status on public.orders
for each row execute procedure public.guard_order_payment_status();

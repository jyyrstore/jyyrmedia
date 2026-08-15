-- JYYR STORE — run this AFTER schema.sql
-- 1) Secure profile updates: normal users must never be able to change role/saldo/point.
drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists profiles_update_admin_only on public.profiles;
create policy profiles_update_admin_only on public.profiles
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- 2) Private bucket for QRIS payment proofs.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- 3) A user can upload/read/delete only inside their own folder; admins can manage all proofs.
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

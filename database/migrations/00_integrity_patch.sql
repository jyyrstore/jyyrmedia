-- JYYR STORE V4.5 — INTEGRITY / DEPENDENCY PATCH
-- Run BEFORE the other V4.5 migrations.
-- This patch makes the package self-contained for the dependencies that
-- were previously assumed to exist in the old database.

begin;

-- =========================================================
-- 1) ADMIN HELPER USED BY RLS / RPCs
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- =========================================================
-- 2) USERNAME -> AUTH EMAIL LOOKUP USED BY login.html
-- =========================================================
create or replace function public.get_auth_email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path=public,auth
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id=p.id
  where lower(p.username)=lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.get_auth_email_by_username(text) from public;
grant execute on function public.get_auth_email_by_username(text) to anon, authenticated;

commit;

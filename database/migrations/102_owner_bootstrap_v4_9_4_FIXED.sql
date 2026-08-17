-- JYYR STORE V4.9.4 — FIXED OWNER SECURITY
-- Owner is NOT self-bootstrapped from the browser.
-- The first Owner must be explicitly assigned from a trusted SQL/admin environment.
-- After assignment, ownership is immutable through the web app.

BEGIN;

CREATE TABLE IF NOT EXISTS public.owner_lock (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  owner_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_lock_singleton CHECK (id=true)
);

-- Keep the table inaccessible to normal authenticated clients.
REVOKE ALL ON TABLE public.owner_lock FROM PUBLIC;
REVOKE ALL ON TABLE public.owner_lock FROM anon;
REVOKE ALL ON TABLE public.owner_lock FROM authenticated;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owner_lock
    WHERE id=true AND owner_id=auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- This is intentionally NOT executable by authenticated users.
-- Run this once from Supabase SQL Editor (or another trusted server-side context)
-- with the UUID of the owner's Auth account:
-- SELECT public.set_initial_owner('OWNER-UUID-HERE'::uuid);
CREATE OR REPLACE FUNCTION public.set_initial_owner(p_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner UUID wajib diisi';
  END IF;

  IF EXISTS (SELECT 1 FROM public.owner_lock WHERE id=true AND owner_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Owner sudah dikunci dan tidak dapat diganti';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role='admin' AND admin_level='super_admin'
      AND id<>p_owner_id
  ) THEN
    RAISE EXCEPTION 'Ada Super Admin lain. Tetapkan akun Owner yang benar terlebih dahulu';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id=p_owner_id AND role='admin'
  ) THEN
    RAISE EXCEPTION 'Akun Owner harus sudah menjadi Admin';
  END IF;

  INSERT INTO public.owner_lock(id,owner_id)
  VALUES(true,p_owner_id)
  ON CONFLICT (id) DO UPDATE SET owner_id=EXCLUDED.owner_id;

  -- Mark this single UPDATE as a trusted bootstrap operation.
  -- The trigger guard recognizes this transaction-local flag and allows
  -- only this server-side bootstrap path to initialize the first Owner.
  PERFORM set_config('app.jyyr_owner_bootstrap', 'true', true);

  UPDATE public.profiles
     SET role='admin', admin_level='super_admin', updated_at=now()
   WHERE id=p_owner_id;

  -- Explicitly clear the flag before returning.
  PERFORM set_config('app.jyyr_owner_bootstrap', 'false', true);

  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,target_id,details)
  VALUES(p_owner_id,'Set fixed Owner','admin',p_owner_id::text,
         jsonb_build_object('admin_level','super_admin','fixed_owner',true));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_initial_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_initial_owner(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_initial_owner(uuid) FROM authenticated;
-- Supabase SQL Editor / trusted server roles can execute SECURITY DEFINER functions.
GRANT EXECUTE ON FUNCTION public.set_initial_owner(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.set_initial_owner(uuid) TO service_role;

-- Owner-only admin permission RPC. No one can create a second Owner.
CREATE OR REPLACE FUNCTION public.admin_set_admin_level(p_user_id uuid,p_level text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.owner_lock WHERE id=true;

  IF v_owner IS NULL OR auth.uid()<>v_owner THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;

  IF p_level NOT IN ('admin','readonly','super_admin') THEN
    RAISE EXCEPTION 'Level tidak valid';
  END IF;

  -- The fixed Owner cannot be demoted.
  IF p_user_id=v_owner AND p_level<>'super_admin' THEN
    RAISE EXCEPTION 'Owner tidak dapat diturunkan';
  END IF;

  -- No other account can ever become Super Admin/Owner.
  IF p_level='super_admin' AND p_user_id<>v_owner THEN
    RAISE EXCEPTION 'Owner hanya dapat satu akun dan tidak dapat dipindahkan';
  END IF;

  UPDATE public.profiles
     SET role='admin', admin_level=p_level, updated_at=now()
   WHERE id=p_user_id AND role='admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin tidak ditemukan';
  END IF;

  PERFORM public.audit('Change admin permission','admin',p_user_id::text,
    jsonb_build_object('level',p_level,'fixed_owner',true));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_admin_level(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_admin_level(uuid,text) TO authenticated;

-- Prevent every non-Owner account, including Admin, from self-promoting.
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  -- Trusted first-Owner bootstrap only. set_initial_owner() is not executable
  -- by anon/authenticated, so normal clients cannot activate this path.
  IF current_setting('app.jyyr_owner_bootstrap', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF auth.uid()=old.id THEN
    IF (new.role<>old.role OR new.admin_level<>old.admin_level) THEN
      IF public.is_owner() THEN
        IF old.id=(SELECT owner_id FROM public.owner_lock WHERE id=true)
           AND (new.role<>old.role OR new.admin_level<>old.admin_level) THEN
          RAISE EXCEPTION 'Owner tidak dapat diubah atau diturunkan';
        END IF;
      ELSE
        RAISE EXCEPTION 'Hanya Owner yang dapat mengubah permission admin';
      END IF;
    END IF;

    IF NOT public.is_admin_writer() THEN
      IF new.account_status<>old.account_status
         OR new.verified<>old.verified
         OR new.saldo<>old.saldo
         OR new.point<>old.point THEN
        RAISE EXCEPTION 'Field profil sensitif hanya dapat diubah admin';
      END IF;
    END IF;
  END IF;

  IF old.role='admin' AND (new.role<>old.role OR new.admin_level<>old.admin_level)
     AND NOT public.is_owner() THEN
    RAISE EXCEPTION 'Hanya Owner yang dapat mengubah permission admin';
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_self_update ON public.profiles;
CREATE TRIGGER guard_profile_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_update();

COMMIT;

-- JYYR STORE V4.8 — FINAL SECURITY / RLS HARDENING
-- IMPORTANT: V4.7 migrations have already been run.
-- Run ONLY this patch on the existing database. Do not rerun archived SQL.
-- Purpose:
--   1) remove readonly write paths caused by legacy is_admin() policies
--   2) guarantee RLS on the core client-facing tables
--   3) provide canonical SELECT/INSERT/UPDATE/DELETE policies for core tables
--   4) verify point_ledger / broadcasts / orders / payments access paths

BEGIN;

-- =========================================================
-- 1. CORE RLS MUST BE ENABLED
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. CORE POLICIES — REPLACE LEGACY/UNKNOWN CORE POLICIES
--    These tables are the source of truth for the frontend.
-- =========================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'profiles','products','orders','payments',
        'levels','broadcasts','point_ledger'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Profiles: users read/update only themselves; writers manage users.
CREATE POLICY v48_profiles_select
ON public.profiles FOR SELECT TO authenticated
USING (id=auth.uid() OR public.is_admin());

CREATE POLICY v48_profiles_insert_block
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (false);


-- Profiles keep the existing guard_profile_self_update trigger from V4.7.
-- It prevents self-service changes to role/admin_level/saldo/point/status/verified.
CREATE POLICY v48_profiles_update
ON public.profiles FOR UPDATE TO authenticated
USING (id=auth.uid() OR public.is_admin_writer())
WITH CHECK (id=auth.uid() OR public.is_admin_writer());

CREATE POLICY v48_profiles_delete_block
ON public.profiles FOR DELETE TO authenticated
USING (false);

-- Products: published products are visible; admins can see all.
CREATE POLICY v48_products_select
ON public.products FOR SELECT TO authenticated
USING (
  (
    active=true
    AND product_status='published'
    AND (scheduled_at IS NULL OR scheduled_at<=now())
    AND (scheduled_until IS NULL OR scheduled_until>now())
  )
  OR public.is_admin()
);

CREATE POLICY v48_products_insert
ON public.products FOR INSERT TO authenticated
WITH CHECK (public.is_admin_writer());

CREATE POLICY v48_products_update
ON public.products FOR UPDATE TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v48_products_delete
ON public.products FOR DELETE TO authenticated
USING (public.is_admin_writer());

-- Orders: user sees own; admin sees all. New orders are RPC-only.
CREATE POLICY v48_orders_select
ON public.orders FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.is_admin());

CREATE POLICY v48_orders_insert_block
ON public.orders FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY v48_orders_update
ON public.orders FOR UPDATE TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v48_orders_delete_block
ON public.orders FOR DELETE TO authenticated
USING (false);

-- Payments: user sees payments belonging to own order; writers can review.
CREATE POLICY v48_payments_select
ON public.payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id=payments.order_id
      AND (o.user_id=auth.uid() OR public.is_admin())
  )
);

CREATE POLICY v48_payments_insert
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_writer()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id=payments.order_id
      AND o.user_id=auth.uid()
  )
);

CREATE POLICY v48_payments_update
ON public.payments FOR UPDATE TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v48_payments_delete_block
ON public.payments FOR DELETE TO authenticated
USING (false);

-- Levels: public to authenticated users; only writers mutate.
CREATE POLICY v48_levels_select
ON public.levels FOR SELECT TO authenticated
USING (true);

CREATE POLICY v48_levels_insert
ON public.levels FOR INSERT TO authenticated
WITH CHECK (public.is_admin_writer());

CREATE POLICY v48_levels_update
ON public.levels FOR UPDATE TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v48_levels_delete
ON public.levels FOR DELETE TO authenticated
USING (public.is_admin_writer());

-- Broadcasts: authenticated users can read; only writers create/delete.
CREATE POLICY v48_broadcasts_select
ON public.broadcasts FOR SELECT TO authenticated
USING (true);

CREATE POLICY v48_broadcasts_insert
ON public.broadcasts FOR INSERT TO authenticated
WITH CHECK (public.is_admin_writer() AND created_by=auth.uid());

CREATE POLICY v48_broadcasts_update_block
ON public.broadcasts FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY v48_broadcasts_delete
ON public.broadcasts FOR DELETE TO authenticated
USING (public.is_admin_writer());

-- Point ledger: read own history/admin; writes are RPC/trigger only.
CREATE POLICY v48_point_ledger_select
ON public.point_ledger FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.is_admin());

CREATE POLICY v48_point_ledger_insert_block
ON public.point_ledger FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY v48_point_ledger_update_block
ON public.point_ledger FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY v48_point_ledger_delete_block
ON public.point_ledger FOR DELETE TO authenticated
USING (false);

-- =========================================================
-- 3. LEGACY WRITE POLICIES — REMOVE is_admin() WRITE PATHS
-- =========================================================
-- Notifications
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_admin ON public.notifications;

CREATE POLICY v48_notifications_insert
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.is_admin_writer());

CREATE POLICY v48_notifications_update
ON public.notifications FOR UPDATE TO authenticated
USING (user_id=auth.uid() OR public.is_admin_writer())
WITH CHECK (user_id=auth.uid() OR public.is_admin_writer());

CREATE POLICY v48_notifications_delete
ON public.notifications FOR DELETE TO authenticated
USING (public.is_admin_writer());

-- Internal notes
DROP POLICY IF EXISTS user_notes_admin_all ON public.user_notes;
DROP POLICY IF EXISTS user_notes_admin ON public.user_notes;
CREATE POLICY v48_user_notes_admin
ON public.user_notes FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

-- Order events: direct inserts are limited to writers; normal order RPCs remain SECURITY DEFINER.
DROP POLICY IF EXISTS order_events_admin_insert ON public.order_events;
CREATE POLICY v48_order_events_insert
ON public.order_events FOR INSERT TO authenticated
WITH CHECK (public.is_admin_writer());

-- Support tickets: users keep their own ticket workflow; admin write access is writer-only.
DROP POLICY IF EXISTS support_update ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_update_own_or_admin ON public.support_tickets;
CREATE POLICY v48_support_tickets_update
ON public.support_tickets FOR UPDATE TO authenticated
USING (user_id=auth.uid() OR public.is_admin_writer())
WITH CHECK (user_id=auth.uid() OR public.is_admin_writer());

-- Ticket messages: user can send to own ticket; admin can send only as a writer.
DROP POLICY IF EXISTS ticket_messages_insert ON public.ticket_messages;
CREATE POLICY v48_ticket_messages_insert
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  (
    sender_id=auth.uid()
    AND internal=false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id=ticket_id AND t.user_id=auth.uid()
    )
  )
  OR (
    public.is_admin_writer()
    AND sender_id=auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id=ticket_id
    )
  )
);

-- FAQ / Help / milestones / expiry / categories / settings
DROP POLICY IF EXISTS faq_items_admin_write ON public.faq_items;
DROP POLICY IF EXISTS faq_admin ON public.faq_items;
CREATE POLICY v48_faq_admin_write
ON public.faq_items FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS help_articles_admin_write ON public.help_articles;
DROP POLICY IF EXISTS help_admin ON public.help_articles;
CREATE POLICY v48_help_admin_write
ON public.help_articles FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS point_milestones_admin_write ON public.point_milestones;
DROP POLICY IF EXISTS milestones_admin ON public.point_milestones;
CREATE POLICY v48_milestones_admin_write
ON public.point_milestones FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS point_expiry_settings_admin_write ON public.point_expiry_settings;
DROP POLICY IF EXISTS expiry_admin ON public.point_expiry_settings;
CREATE POLICY v48_expiry_admin_write
ON public.point_expiry_settings FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS categories_admin_write ON public.categories;
CREATE POLICY v48_categories_admin_write
ON public.categories FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS store_settings_admin_write ON public.store_settings;
CREATE POLICY v48_store_settings_admin_write
ON public.store_settings FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

-- Balance ledger is RPC-only for writes.
DROP POLICY IF EXISTS balance_ledger_admin_insert ON public.balance_ledger;
CREATE POLICY v48_balance_ledger_insert_block
ON public.balance_ledger FOR INSERT TO authenticated
WITH CHECK (false);

COMMIT;

-- JYYR STORE MEDIA V4.9.4 — FINAL INTEGRITY PATCH
-- Run this file LAST, after all existing migrations in this folder.
-- Safe to run more than once (idempotent).
-- Does not replace the existing application/order/payment system.
-- Purpose:
--   1) remove legacy V4.07 write policies that use is_admin()
--   2) keep readonly admins read-only on affected tables
--   3) make payment-proof UPDATE/DELETE writer-only
--   4) enforce payment verification before processing/success
--   5) keep RLS enabled on the affected support tables

BEGIN;

-- =========================================================
-- 1. ENSURE RLS IS ENABLED ON THE AFFECTED TABLES
-- =========================================================
ALTER TABLE public.balance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_rewards_awarded ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_expiry_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. REMOVE LEGACY V4.07 WRITE POLICIES
--    (SELECT policies from V4.07 are intentionally retained.)
-- =========================================================
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_admin ON public.notifications;

DROP POLICY IF EXISTS user_notes_admin_all ON public.user_notes;
DROP POLICY IF EXISTS order_events_admin_insert ON public.order_events;

DROP POLICY IF EXISTS support_tickets_update_own_or_admin ON public.support_tickets;
DROP POLICY IF EXISTS ticket_messages_insert ON public.ticket_messages;

DROP POLICY IF EXISTS faq_items_admin_write ON public.faq_items;
DROP POLICY IF EXISTS help_articles_admin_write ON public.help_articles;
DROP POLICY IF EXISTS point_milestones_admin_write ON public.point_milestones;
DROP POLICY IF EXISTS point_expiry_settings_admin_write ON public.point_expiry_settings;
DROP POLICY IF EXISTS categories_admin_write ON public.categories;
DROP POLICY IF EXISTS store_settings_admin_write ON public.store_settings;

-- Also remove aliases used by earlier patches, so repeated deployments cannot
-- leave an older is_admin() write path behind.
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS user_notes_admin ON public.user_notes;
DROP POLICY IF EXISTS faq_admin ON public.faq_items;
DROP POLICY IF EXISTS help_admin ON public.help_articles;
DROP POLICY IF EXISTS milestones_admin ON public.point_milestones;
DROP POLICY IF EXISTS expiry_admin ON public.point_expiry_settings;

-- =========================================================
-- 3. CANONICAL WRITER-ONLY WRITE POLICIES
-- Drop the patch policies first so this file is safe to re-run.
DROP POLICY IF EXISTS v494_notifications_insert ON public.notifications;
DROP POLICY IF EXISTS v494_notifications_update ON public.notifications;
DROP POLICY IF EXISTS v494_notifications_delete ON public.notifications;
DROP POLICY IF EXISTS v494_user_notes_admin ON public.user_notes;
DROP POLICY IF EXISTS v494_order_events_insert ON public.order_events;
DROP POLICY IF EXISTS v494_support_tickets_update ON public.support_tickets;
DROP POLICY IF EXISTS v494_ticket_messages_insert ON public.ticket_messages;
DROP POLICY IF EXISTS v494_faq_admin_write ON public.faq_items;
DROP POLICY IF EXISTS v494_help_admin_write ON public.help_articles;
DROP POLICY IF EXISTS v494_milestones_admin_write ON public.point_milestones;
DROP POLICY IF EXISTS v494_expiry_admin_write ON public.point_expiry_settings;
DROP POLICY IF EXISTS v494_categories_admin_write ON public.categories;
DROP POLICY IF EXISTS v494_store_settings_admin_write ON public.store_settings;
DROP POLICY IF EXISTS v494_payment_proofs_update ON storage.objects;
DROP POLICY IF EXISTS v494_payment_proofs_delete ON storage.objects;
--    User-owned notification/ticket actions remain available.
-- =========================================================
CREATE POLICY v494_notifications_insert
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_notifications_update
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin_writer())
WITH CHECK (user_id = auth.uid() OR public.is_admin_writer());

CREATE POLICY v494_notifications_delete
ON public.notifications FOR DELETE TO authenticated
USING (public.is_admin_writer());

CREATE POLICY v494_user_notes_admin
ON public.user_notes FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_order_events_insert
ON public.order_events FOR INSERT TO authenticated
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_support_tickets_update
ON public.support_tickets FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin_writer())
WITH CHECK (user_id = auth.uid() OR public.is_admin_writer());

CREATE POLICY v494_ticket_messages_insert
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  (
    sender_id = auth.uid()
    AND internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND t.user_id = auth.uid()
    )
  )
  OR (
    public.is_admin_writer()
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_messages.ticket_id
    )
  )
);

CREATE POLICY v494_faq_admin_write
ON public.faq_items FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_help_admin_write
ON public.help_articles FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_milestones_admin_write
ON public.point_milestones FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_expiry_admin_write
ON public.point_expiry_settings FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_categories_admin_write
ON public.categories FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

CREATE POLICY v494_store_settings_admin_write
ON public.store_settings FOR ALL TO authenticated
USING (public.is_admin_writer())
WITH CHECK (public.is_admin_writer());

-- =========================================================
-- 4. PAYMENT-PROOF STORAGE
--    Users retain ownership of their own proof files.
--    Only admin writers may modify/delete other files.
-- =========================================================
DROP POLICY IF EXISTS payment_proofs_update_own_or_admin ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_delete_own_or_admin ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_update ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_delete ON storage.objects;

CREATE POLICY v494_payment_proofs_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR public.is_admin_writer()
  )
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR public.is_admin_writer()
  )
);

CREATE POLICY v494_payment_proofs_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR public.is_admin_writer()
  )
);

-- =========================================================
-- 5. ORDER PAYMENT GUARD
--    Prevent direct admin updates from bypassing payment verification.
--    Normal balance orders still work because they verify payment before
--    updating the order to processing.
-- =========================================================
CREATE OR REPLACE FUNCTION public.guard_order_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('processing', 'success')
     AND COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.payments p
      WHERE p.order_id = NEW.id
        AND p.status = 'verified'
    ) THEN
      RAISE EXCEPTION 'Payment must be verified before order can be processing/success';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_order_payment_status ON public.orders;
CREATE TRIGGER guard_order_payment_status
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.guard_order_payment_status();

REVOKE ALL ON FUNCTION public.guard_order_payment_status() FROM PUBLIC;

COMMIT;

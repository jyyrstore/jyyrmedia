/* ============================================================
   JYYR STORE V4-07
   RLS HARDENING
   Based on actual current database schema
   ============================================================ */

BEGIN;


/* ============================================================
   1. ENABLE RLS
   ============================================================ */

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


/* ============================================================
   2. BALANCE LEDGER
   User:
     - SELECT own records
   Admin:
     - SELECT all
   Write:
     - handled through secure RPC
   ============================================================ */

DROP POLICY IF EXISTS balance_ledger_select_own_or_admin
ON public.balance_ledger;

CREATE POLICY balance_ledger_select_own_or_admin
ON public.balance_ledger
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
);


/* ============================================================
   3. REFUNDS
   User:
     - SELECT own refunds
   Admin:
     - SELECT all
   Write:
     - admin/RPC only
   ============================================================ */

DROP POLICY IF EXISTS refunds_select_own_or_admin
ON public.refunds;

CREATE POLICY refunds_select_own_or_admin
ON public.refunds
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
);


/* ============================================================
   4. NOTIFICATIONS
   User:
     - SELECT own notifications
     - UPDATE own notification read state
   Admin:
     - SELECT / INSERT / UPDATE / DELETE
   ============================================================ */

DROP POLICY IF EXISTS notifications_select_own_or_admin
ON public.notifications;

CREATE POLICY notifications_select_own_or_admin
ON public.notifications
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
);


DROP POLICY IF EXISTS notifications_insert_admin
ON public.notifications;

CREATE POLICY notifications_insert_admin
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
    is_admin()
);


DROP POLICY IF EXISTS notifications_update_own_or_admin
ON public.notifications;

CREATE POLICY notifications_update_own_or_admin
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
)
WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
);


DROP POLICY IF EXISTS notifications_delete_admin
ON public.notifications;

CREATE POLICY notifications_delete_admin
ON public.notifications
FOR DELETE
TO authenticated
USING (
    is_admin()
);


/* ============================================================
   5. USER NOTES
   Internal admin data.
   Admin only.
   ============================================================ */

DROP POLICY IF EXISTS user_notes_admin_all
ON public.user_notes;

CREATE POLICY user_notes_admin_all
ON public.user_notes
FOR ALL
TO authenticated
USING (
    is_admin()
)
WITH CHECK (
    is_admin()
);


/* ============================================================
   6. ORDER EVENTS
   User:
     - SELECT events belonging to own order
   Admin:
     - SELECT all
   Write:
     - secure server/RPC only
   ============================================================ */

DROP POLICY IF EXISTS order_events_select_own_or_admin
ON public.order_events;

CREATE POLICY order_events_select_own_or_admin
ON public.order_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_events.order_id
          AND (
              o.user_id = auth.uid()
              OR is_admin()
          )
    )
);


/* ============================================================
   7. ADMIN AUDIT LOG
   Admin only.
   No direct user modification.
   ============================================================ */

DROP POLICY IF EXISTS admin_audit_logs_admin_select
ON public.admin_audit_logs;

CREATE POLICY admin_audit_logs_admin_select
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (
    is_admin()
);


/* ============================================================
   8. LOGIN ACTIVITY
   User:
     - SELECT own login activity
   Admin:
     - SELECT all
   Insert:
     - application/RPC only
   ============================================================ */

DROP POLICY IF EXISTS login_activity_select_own_or_admin
ON public.login_activity;

CREATE POLICY login_activity_select_own_or_admin
ON public.login_activity
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
);


/* ============================================================
   9. SUPPORT TICKETS
   User:
     - SELECT own tickets
     - CREATE own tickets
     - UPDATE own tickets
   Admin:
     - ALL
   ============================================================ */

DROP POLICY IF EXISTS support_tickets_select_own_or_admin
ON public.support_tickets;

CREATE POLICY support_tickets_select_own_or_admin
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
);


DROP POLICY IF EXISTS support_tickets_insert_own
ON public.support_tickets;

CREATE POLICY support_tickets_insert_own
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);


DROP POLICY IF EXISTS support_tickets_update_own_or_admin
ON public.support_tickets;

CREATE POLICY support_tickets_update_own_or_admin
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
)
WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
);


/* ============================================================
   10. TICKET MESSAGES
   User:
     - read messages on own ticket
     - send messages to own ticket
   Admin:
     - full access
   Internal messages:
     - admin only
   ============================================================ */

DROP POLICY IF EXISTS ticket_messages_select
ON public.ticket_messages;

CREATE POLICY ticket_messages_select
ON public.ticket_messages
FOR SELECT
TO authenticated
USING (
    is_admin()
    OR (
        internal = false
        AND EXISTS (
            SELECT 1
            FROM public.support_tickets t
            WHERE t.id = ticket_messages.ticket_id
              AND t.user_id = auth.uid()
        )
    )
);


DROP POLICY IF EXISTS ticket_messages_insert
ON public.ticket_messages;

CREATE POLICY ticket_messages_insert
ON public.ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
    is_admin()
    OR (
        sender_id = auth.uid()
        AND internal = false
        AND EXISTS (
            SELECT 1
            FROM public.support_tickets t
            WHERE t.id = ticket_messages.ticket_id
              AND t.user_id = auth.uid()
        )
    )
);


/* ============================================================
   11. FAQ
   Public authenticated users:
     - SELECT active FAQ
   Admin:
     - ALL
   ============================================================ */

DROP POLICY IF EXISTS faq_items_select_active
ON public.faq_items;

CREATE POLICY faq_items_select_active
ON public.faq_items
FOR SELECT
TO authenticated
USING (
    active = true
    OR is_admin()
);


DROP POLICY IF EXISTS faq_items_admin_write
ON public.faq_items;

CREATE POLICY faq_items_admin_write
ON public.faq_items
FOR ALL
TO authenticated
USING (
    is_admin()
)
WITH CHECK (
    is_admin()
);


/* ============================================================
   12. HELP ARTICLES
   Public authenticated users:
     - SELECT active articles
   Admin:
     - ALL
   ============================================================ */

DROP POLICY IF EXISTS help_articles_select_active
ON public.help_articles;

CREATE POLICY help_articles_select_active
ON public.help_articles
FOR SELECT
TO authenticated
USING (
    active = true
    OR is_admin()
);


DROP POLICY IF EXISTS help_articles_admin_write
ON public.help_articles;

CREATE POLICY help_articles_admin_write
ON public.help_articles
FOR ALL
TO authenticated
USING (
    is_admin()
)
WITH CHECK (
    is_admin()
);


/* ============================================================
   13. LEVEL REWARDS AWARDED
   User:
     - SELECT own rewards
   Admin:
     - SELECT all
   Write:
     - RPC/server only
   ============================================================ */

DROP POLICY IF EXISTS level_rewards_awarded_select
ON public.level_rewards_awarded;

CREATE POLICY level_rewards_awarded_select
ON public.level_rewards_awarded
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
);


/* ============================================================
   14. POINT MILESTONES
   User:
     - SELECT active milestones
   Admin:
     - ALL
   ============================================================ */

DROP POLICY IF EXISTS point_milestones_select_active
ON public.point_milestones;

CREATE POLICY point_milestones_select_active
ON public.point_milestones
FOR SELECT
TO authenticated
USING (
    active = true
    OR is_admin()
);


DROP POLICY IF EXISTS point_milestones_admin_write
ON public.point_milestones;

CREATE POLICY point_milestones_admin_write
ON public.point_milestones
FOR ALL
TO authenticated
USING (
    is_admin()
)
WITH CHECK (
    is_admin()
);


/* ============================================================
   15. POINT EXPIRY SETTINGS
   User:
     - SELECT settings
   Admin:
     - ALL
   ============================================================ */

DROP POLICY IF EXISTS point_expiry_settings_select
ON public.point_expiry_settings;

CREATE POLICY point_expiry_settings_select
ON public.point_expiry_settings
FOR SELECT
TO authenticated
USING (
    true
);


DROP POLICY IF EXISTS point_expiry_settings_admin_write
ON public.point_expiry_settings;

CREATE POLICY point_expiry_settings_admin_write
ON public.point_expiry_settings
FOR ALL
TO authenticated
USING (
    is_admin()
)
WITH CHECK (
    is_admin()
);


/* ============================================================
   16. CATEGORIES
   User:
     - SELECT active categories
   Admin:
     - ALL
   ============================================================ */

DROP POLICY IF EXISTS categories_select_active
ON public.categories;

CREATE POLICY categories_select_active
ON public.categories
FOR SELECT
TO authenticated
USING (
    active = true
    OR is_admin()
);


DROP POLICY IF EXISTS categories_admin_write
ON public.categories;

CREATE POLICY categories_admin_write
ON public.categories
FOR ALL
TO authenticated
USING (
    is_admin()
)
WITH CHECK (
    is_admin()
);


/* ============================================================
   17. STORE SETTINGS
   User:
     - SELECT
   Admin:
     - ALL
   ============================================================ */

DROP POLICY IF EXISTS store_settings_select_auth
ON public.store_settings;

CREATE POLICY store_settings_select_auth
ON public.store_settings
FOR SELECT
TO authenticated
USING (
    true
);


DROP POLICY IF EXISTS store_settings_admin_write
ON public.store_settings;

CREATE POLICY store_settings_admin_write
ON public.store_settings
FOR ALL
TO authenticated
USING (
    is_admin()
)
WITH CHECK (
    is_admin()
);


COMMIT;
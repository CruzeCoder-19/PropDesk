-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE public.notification_type    AS ENUM ('dues_reminder', 'overdue_alert', 'general');
CREATE TYPE public.notification_channel AS ENUM ('whatsapp', 'sms', 'email', 'in_app');
CREATE TYPE public.notification_status  AS ENUM ('pending', 'sent', 'failed');

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id                 uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid                   NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id         uuid                   REFERENCES public.bookings(id)          ON DELETE SET NULL,
  milestone_id       uuid                   REFERENCES public.payment_milestones(id) ON DELETE SET NULL,
  client_profile_id  uuid                   REFERENCES public.profiles(id)          ON DELETE SET NULL,
  type               public.notification_type    NOT NULL DEFAULT 'dues_reminder',
  channel            public.notification_channel NOT NULL DEFAULT 'whatsapp',
  message_text       text                   NOT NULL,
  status             public.notification_status  NOT NULL DEFAULT 'pending',
  sent_at            timestamptz,
  created_at         timestamptz            NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX notifications_org_idx        ON public.notifications (organization_id);
CREATE INDEX notifications_status_idx     ON public.notifications (status);
CREATE INDEX notifications_milestone_idx  ON public.notifications (milestone_id);
CREATE INDEX notifications_created_idx    ON public.notifications (created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin / sales_manager can read their org's notifications
CREATE POLICY "notifications_select_staff"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = notifications.organization_id
        AND profiles.role IN ('admin', 'sales_manager')
    )
  );

-- Service role (CRON / Route Handlers using admin client) can do everything — no RLS restriction applies.

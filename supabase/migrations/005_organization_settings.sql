-- Organization-level configuration store.
-- Settings are stored as a single JSONB blob per org for flexibility.
-- Current schema for settings.whatsapp:
--   { "provider": "interakt"|"wati"|"aisensy"|"meta",
--     "api_key": "...",
--     "templates": {
--       "thank_you": "template_id",
--       "brochure": "template_id",
--       "due_reminder": "template_id",
--       "booking_confirmation": "template_id"
--     }
--   }

CREATE TABLE public.organization_settings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Admin and sales_manager can read their org's settings
CREATE POLICY "org_settings_select" ON public.organization_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organization_settings.organization_id
        AND profiles.role IN ('admin', 'sales_manager')
    )
  );

-- Only admin can insert/update settings
CREATE POLICY "org_settings_write" ON public.organization_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organization_settings.organization_id
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organization_settings.organization_id
        AND profiles.role = 'admin'
    )
  );

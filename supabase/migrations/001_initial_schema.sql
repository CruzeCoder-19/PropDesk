-- ================================================================
-- PropDesk — 001_initial_schema.sql
-- Real Estate CRM: complete initial schema
--
-- Execution order:
--   1. Extensions
--   2. Enum types
--   3. Tables (dependency order: orgs → profiles → projects →
--              units → leads → lead_activities → bookings →
--              payment_milestones → documents)
--   4. Helper functions (SECURITY DEFINER)
--   5. updated_at trigger
--   6. handle_new_user trigger
--   7. Row Level Security
--   8. Indexes
-- ================================================================


-- ================================================================
-- 1. EXTENSIONS
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4() fallback
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid() (preferred)


-- ================================================================
-- 2. ENUM TYPES
-- ================================================================

-- Internal staff + buyer roles
CREATE TYPE public.user_role AS ENUM (
  'admin',          -- full org control
  'sales_manager',  -- manages team, sees all leads
  'salesperson',    -- manages own leads
  'client'          -- buyer, restricted portal access
);

CREATE TYPE public.project_type AS ENUM (
  'apartment', 'villa', 'plot', 'commercial'
);

CREATE TYPE public.project_status AS ENUM (
  'upcoming', 'active', 'sold_out', 'completed'
);

-- Full unit lifecycle
CREATE TYPE public.unit_status AS ENUM (
  'available',  -- open for sale
  'blocked',    -- temporarily held by a salesperson
  'booked',     -- token paid, awaiting agreement
  'sold',       -- agreement registered
  'mortgage'    -- under bank mortgage, not freely sellable
);

-- Lead acquisition channels — covers Indian RE portals explicitly
CREATE TYPE public.lead_source AS ENUM (
  'website', 'facebook', 'instagram', 'google_ads',
  'referral', 'walk_in', 'justdial', '99acres', 'magicbricks', 'other'
);

CREATE TYPE public.lead_score AS ENUM (
  'hot',   -- ready to buy within 30 days
  'warm',  -- actively evaluating
  'cold'   -- early-stage inquiry
);

CREATE TYPE public.lead_status AS ENUM (
  'new', 'contacted', 'site_visit_scheduled',
  'site_visited', 'negotiation', 'won', 'lost'
);

CREATE TYPE public.activity_type AS ENUM (
  'call', 'whatsapp', 'email', 'site_visit',
  'meeting', 'note', 'status_change', 'follow_up_scheduled'
);

CREATE TYPE public.payment_plan_type AS ENUM (
  'construction_linked', -- pay as construction progresses (most common in India)
  'down_payment',        -- bulk upfront
  'flexi',               -- hybrid down + CLP
  'custom'               -- ad-hoc milestones
);

CREATE TYPE public.booking_status AS ENUM (
  'token_paid',       -- initial booking amount received
  'agreement_signed', -- sale agreement executed
  'loan_processing',  -- bank loan in progress
  'registered',       -- sale deed registered with sub-registrar
  'possession',       -- keys handed over to buyer
  'cancelled'
);

CREATE TYPE public.milestone_status AS ENUM (
  'upcoming', 'due', 'paid', 'overdue'
);

CREATE TYPE public.document_type AS ENUM (
  'brochure', 'allotment_letter', 'agreement', 'receipt',
  'noc', 'plan_approval', 'rera_certificate', 'other'
);


-- ================================================================
-- 3. TABLES
-- ================================================================

-- ----------------------------------------------------------------
-- organizations
-- Multi-tenant root. Every builder / developer is one org.
-- All data is scoped under organization_id.
-- ----------------------------------------------------------------
CREATE TABLE public.organizations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        NOT NULL UNIQUE, -- URL-safe identifier, e.g. "suncity-builders"
  logo_url        text,
  address         text,
  city            text,
  state           text,
  gst_number      text,
  rera_number     text,        -- org-level RERA (state registration)
  contact_email   text,
  contact_phone   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.organizations IS
  'Top-level multi-tenant entity. Each real estate builder/developer is one organization.';
COMMENT ON COLUMN public.organizations.slug IS
  'URL-friendly unique identifier used in subdomains / routes (e.g. "suncity-builders").';
COMMENT ON COLUMN public.organizations.rera_number IS
  'Organizational RERA registration. Individual projects carry their own rera_id.';


-- ----------------------------------------------------------------
-- profiles
-- App-level user data extending auth.users (1:1).
-- Created automatically by the handle_new_user trigger.
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text,
  phone           text,
  role            public.user_role NOT NULL DEFAULT 'salesperson',
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE SET NULL,
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles IS
  'App-level user profiles — extends auth.users 1:1. Auto-created on signup via trigger.';
COMMENT ON COLUMN public.profiles.organization_id IS
  'NULL until an admin assigns the user to an org. Users with NULL org_id see nothing.';
COMMENT ON COLUMN public.profiles.role IS
  '"client" = buyer with restricted portal access. All other roles are internal staff.';


-- ----------------------------------------------------------------
-- projects
-- A named real estate project (tower / layout / phase).
-- Each org can have many projects.
-- ----------------------------------------------------------------
CREATE TABLE public.projects (
  id                   uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                 text            NOT NULL,
  slug                 text            NOT NULL,    -- unique within the org
  address              text,
  city                 text,
  type                 public.project_type  NOT NULL,
  total_units          int             NOT NULL DEFAULT 0,
  description          text,
  rera_id              text,           -- project-level RERA registration number
  brochure_url         text,
  site_map_image_url   text,
  status               public.project_status NOT NULL DEFAULT 'upcoming',
  created_at           timestamptz     NOT NULL DEFAULT now(),
  updated_at           timestamptz     NOT NULL DEFAULT now(),

  UNIQUE (organization_id, slug)
);

COMMENT ON TABLE  public.projects IS
  'Real estate projects (towers/layouts/phases) belonging to an organization.';
COMMENT ON COLUMN public.projects.rera_id IS
  'Project-level RERA registration — legally required to be displayed on all marketing.';
COMMENT ON COLUMN public.projects.slug IS
  'URL-safe name, unique within the organization (enforced by composite UNIQUE constraint).';


-- ----------------------------------------------------------------
-- units
-- Individual saleable unit (flat / villa / plot) within a project.
-- Tracks the full availability → blocked → booked → sold lifecycle.
-- ----------------------------------------------------------------
CREATE TABLE public.units (
  id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  unit_number             text            NOT NULL,  -- e.g. "A-301", "Villa-12", "Plot-88"
  floor                   int,
  block                   text,
  type                    text            NOT NULL,  -- free-text: "2BHK", "3BHK", "Plot-1200sqft"
  carpet_area_sqft        numeric(10, 2),
  super_buildup_area_sqft numeric(10, 2),
  base_price              numeric(14, 2), -- per-sqft or flat base; used for discount calculations
  total_price             numeric(14, 2), -- includes floor rise, facing premium, parking, etc.
  status                  public.unit_status NOT NULL DEFAULT 'available',
  facing                  text,           -- e.g. "North", "East-Garden", "Pool Facing"
  parking_included        boolean         NOT NULL DEFAULT false,

  -- Blocking (temporary hold by salesperson before booking)
  blocked_by              uuid            REFERENCES public.profiles(id) ON DELETE SET NULL,
  blocked_at              timestamptz,

  -- Sale tracking
  sold_to                 uuid            REFERENCES public.profiles(id) ON DELETE SET NULL,
  sold_at                 timestamptz,

  notes                   text,
  created_at              timestamptz     NOT NULL DEFAULT now(),
  updated_at              timestamptz     NOT NULL DEFAULT now(),

  UNIQUE (project_id, unit_number)
);

COMMENT ON TABLE  public.units IS
  'Individual saleable units within a project. Status lifecycle: available → blocked → booked → sold.';
COMMENT ON COLUMN public.units.base_price IS
  'Base calculation price. total_price = base_price + floor-rise + facing premium + parking etc.';
COMMENT ON COLUMN public.units.blocked_by IS
  'Salesperson who temporarily holds the unit. Cleared when booking is confirmed or block expires.';
COMMENT ON COLUMN public.units.sold_to IS
  'Profile of the buyer (role = client). Set when booking status reaches "registered".';


-- ----------------------------------------------------------------
-- leads
-- Prospective buyers moving through the sales funnel.
-- Converts to a booking on won.
-- ----------------------------------------------------------------
CREATE TABLE public.leads (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid             NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id          uuid             REFERENCES public.projects(id) ON DELETE SET NULL,
  name                text             NOT NULL,
  email               text,
  phone               text             NOT NULL,
  whatsapp_number     text,
  source              public.lead_source  NOT NULL DEFAULT 'other',
  score               public.lead_score   NOT NULL DEFAULT 'cold',
  status              public.lead_status  NOT NULL DEFAULT 'new',
  assigned_to         uuid             REFERENCES public.profiles(id) ON DELETE SET NULL,
  budget_min          numeric(14, 2),
  budget_max          numeric(14, 2),
  preferred_unit_type text,            -- e.g. "2BHK", "Plot", "Villa"
  notes               text,
  last_contacted_at   timestamptz,

  -- Marketing attribution (captured from UTM-tagged landing page forms)
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,

  created_at          timestamptz      NOT NULL DEFAULT now(),
  updated_at          timestamptz      NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.leads IS
  'Prospective buyers. Moves through status funnel; converts to booking when status = "won".';
COMMENT ON COLUMN public.leads.score IS
  'Qualification: hot = buying within 30 days, warm = actively evaluating, cold = early inquiry.';
COMMENT ON COLUMN public.leads.utm_source IS
  'UTM attribution parameters — populate from lead capture form query strings.';


-- ----------------------------------------------------------------
-- lead_activities
-- Append-only log of every interaction with a lead.
-- Never delete or update rows here; insert only.
-- ----------------------------------------------------------------
CREATE TABLE public.lead_activities (
  id             uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid                NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type  public.activity_type NOT NULL,
  description    text,
  performed_by   uuid                NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  scheduled_at   timestamptz,        -- non-null for follow_up_scheduled activities
  created_at     timestamptz         NOT NULL DEFAULT now()

  -- Intentionally no updated_at: this table is append-only
);

COMMENT ON TABLE  public.lead_activities IS
  'Append-only audit log of all actions on a lead (calls, visits, notes, status changes).';
COMMENT ON COLUMN public.lead_activities.scheduled_at IS
  'Populated for "follow_up_scheduled" activities — when the follow-up should occur.';
COMMENT ON COLUMN public.lead_activities.performed_by IS
  'ON DELETE RESTRICT: prevents deleting a profile that has activity history.';


-- ----------------------------------------------------------------
-- bookings
-- A confirmed unit reservation linking a unit to a buyer.
-- Anchor record for the entire payment and document trail.
-- ----------------------------------------------------------------
CREATE TABLE public.bookings (
  id                   uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id              uuid                    NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  lead_id              uuid                    REFERENCES public.leads(id) ON DELETE SET NULL,
  organization_id      uuid                    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_profile_id    uuid                    NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  booking_date         date                    NOT NULL DEFAULT CURRENT_DATE,
  agreement_value      numeric(14, 2)          NOT NULL,
  gst_amount           numeric(14, 2)          NOT NULL DEFAULT 0,
  total_amount         numeric(14, 2)          NOT NULL, -- agreement_value + gst + other charges
  payment_plan         public.payment_plan_type NOT NULL DEFAULT 'construction_linked',
  status               public.booking_status   NOT NULL DEFAULT 'token_paid',
  allotment_letter_url text,
  agreement_url        text,
  notes                text,
  created_at           timestamptz             NOT NULL DEFAULT now(),
  updated_at           timestamptz             NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.bookings IS
  'Confirmed unit booking. Created when lead status = "won". Drives payment schedule and documents.';
COMMENT ON COLUMN public.bookings.total_amount IS
  'Final payable: agreement_value + gst_amount + any applicable premiums or charges.';
COMMENT ON COLUMN public.bookings.client_profile_id IS
  'The buyer''s profile (role = client). ON DELETE RESTRICT prevents accidental data loss.';
COMMENT ON COLUMN public.bookings.unit_id IS
  'ON DELETE RESTRICT: a unit with a booking cannot be deleted; cancel the booking first.';


-- ----------------------------------------------------------------
-- payment_milestones
-- Installment schedule for a booking.
-- Typically construction-linked for Indian residential projects.
-- ----------------------------------------------------------------
CREATE TABLE public.payment_milestones (
  id               uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid                    NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  milestone_name   text                    NOT NULL, -- e.g. "Foundation Complete", "3rd Slab", "Handover"
  milestone_order  int                     NOT NULL, -- 1-based sequence within the booking
  amount_due       numeric(14, 2)          NOT NULL,
  due_date         date,
  status           public.milestone_status NOT NULL DEFAULT 'upcoming',
  paid_amount      numeric(14, 2),         -- may differ from amount_due (partial payment)
  paid_date        date,
  receipt_url      text,
  reminder_sent    boolean                 NOT NULL DEFAULT false,
  created_at       timestamptz             NOT NULL DEFAULT now(),
  updated_at       timestamptz             NOT NULL DEFAULT now(),

  UNIQUE (booking_id, milestone_order)
);

COMMENT ON TABLE  public.payment_milestones IS
  'Individual payment installments for a booking. Supports CLP, down-payment, and custom schedules.';
COMMENT ON COLUMN public.payment_milestones.paid_amount IS
  'Actual amount received — may be less than amount_due for partial/post-dated cheque payments.';
COMMENT ON COLUMN public.payment_milestones.reminder_sent IS
  'Set true after automated reminder is sent. Should be reset if due_date is revised.';


-- ----------------------------------------------------------------
-- documents
-- File metadata; actual files live in Supabase Storage.
-- booking_id NULL = org/project-level document (brochure, RERA cert).
-- ----------------------------------------------------------------
CREATE TABLE public.documents (
  id                uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid                   REFERENCES public.bookings(id) ON DELETE CASCADE, -- NULL = org-level
  organization_id   uuid                   NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by       uuid                   NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  document_type     public.document_type   NOT NULL,
  file_name         text                   NOT NULL,
  file_url          text                   NOT NULL,  -- Supabase Storage signed/public URL
  file_size_kb      int,
  visible_to_client boolean                NOT NULL DEFAULT false,
  created_at        timestamptz            NOT NULL DEFAULT now()

  -- No updated_at: documents are immutable; replace by deleting and re-uploading
);

COMMENT ON TABLE  public.documents IS
  'File references for all documents. booking_id NULL = org-level doc (brochures, RERA certs). '
  'Actual files are stored in Supabase Storage; this table holds metadata and access control.';
COMMENT ON COLUMN public.documents.visible_to_client IS
  'When true, the document appears in the client portal for the relevant booking owner.';
COMMENT ON COLUMN public.documents.file_url IS
  'Supabase Storage object path or signed URL. Rotate signed URLs at the application layer.';


-- ================================================================
-- 4. HELPER FUNCTIONS  (SECURITY DEFINER)
-- These run as the function owner and bypass RLS, which prevents
-- infinite recursion when policies on other tables query profiles.
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id
  FROM   public.profiles
  WHERE  id = auth.uid()
$$;

COMMENT ON FUNCTION public.get_user_organization_id() IS
  'Returns current user''s organization_id. SECURITY DEFINER bypasses RLS to prevent recursion.';


CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::text
  FROM   public.profiles
  WHERE  id = auth.uid()
$$;

COMMENT ON FUNCTION public.get_user_role() IS
  'Returns current user''s role as text. SECURITY DEFINER bypasses RLS to prevent recursion.';


-- ================================================================
-- 5. TRIGGER: update_updated_at
-- Bumps updated_at to now() before any UPDATE on tables that
-- carry that column.
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS
  'Generic BEFORE UPDATE trigger function that keeps updated_at current.';

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_payment_milestones_updated_at
  BEFORE UPDATE ON public.payment_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- lead_activities and documents are append-only — no updated_at trigger needed.


-- ================================================================
-- 6. TRIGGER: handle_new_user
-- Fires AFTER INSERT on auth.users and creates the matching
-- public.profiles row.
-- Reads full_name and role from raw_user_meta_data if provided
-- at signup (e.g. via supabase.auth.signUp({ data: { full_name } })).
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role := 'salesperson';
BEGIN
  -- Attempt to parse role from metadata; fall back to default on invalid value
  BEGIN
    IF (NEW.raw_user_meta_data->>'role') IS NOT NULL THEN
      v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    END IF;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_role := 'salesperson';
  END;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      split_part(NEW.email, '@', 1)   -- last-resort fallback: "john" from "john@example.com"
    ),
    v_role
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'AFTER INSERT on auth.users: creates a profiles row. '
  'Reads full_name/name and role from raw_user_meta_data; falls back gracefully.';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- 7. ROW LEVEL SECURITY
--
-- Design principles:
--   • Internal staff (admin / sales_manager / salesperson) see all
--     data belonging to their organization.
--   • Clients (role = 'client') see ONLY:
--       - Their own bookings
--       - Payment milestones for their own bookings
--       - Documents marked visible_to_client = true for their bookings
--         (or org-level docs with visible_to_client = true)
--   • INSERT/UPDATE/DELETE follow least-privilege by role.
--   • service_role key bypasses RLS entirely (used server-side).
-- ================================================================

ALTER TABLE public.organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents          ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- organizations
-- ----------------------------------------------------------------

-- Any authenticated member of an org can read it.
CREATE POLICY "organizations: members can read own org"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_organization_id());

-- Only admins may update org details.
CREATE POLICY "organizations: admins can update own org"
  ON public.organizations FOR UPDATE
  USING (
    id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  )
  WITH CHECK (
    id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

-- INSERT: no authenticated user policy — orgs are created via service_role during
-- onboarding. Add a policy here if you build a self-serve signup flow later.


-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------

-- Internal staff see all profiles in their org.
-- Every user always sees their own profile (needed for the helper functions).
CREATE POLICY "profiles: staff see own org"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (
      organization_id = public.get_user_organization_id()
      AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
    )
  );

-- Clients only see their own profile.
CREATE POLICY "profiles: clients see only self"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    AND public.get_user_role() = 'client'
  );

-- Every user may update their own profile (name, phone, avatar).
CREATE POLICY "profiles: users update self"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins and managers may update any profile in their org
-- (e.g., assigning organization_id or changing role).
CREATE POLICY "profiles: managers update org members"
  ON public.profiles FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

-- INSERT: handled by the handle_new_user trigger (service_role context).


-- ----------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------

-- Internal staff see all projects in their org.
CREATE POLICY "projects: staff see own org"
  ON public.projects FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  );

-- Clients see only projects where they have a booking.
CREATE POLICY "projects: clients see booked projects"
  ON public.projects FOR SELECT
  USING (
    public.get_user_role() = 'client'
    AND EXISTS (
      SELECT 1
      FROM   public.bookings   b
      JOIN   public.units      u ON u.id = b.unit_id
      WHERE  b.client_profile_id = auth.uid()
        AND  u.project_id = projects.id
    )
  );

-- Admins and managers may insert/update/delete projects.
CREATE POLICY "projects: managers insert"
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

CREATE POLICY "projects: managers update"
  ON public.projects FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

CREATE POLICY "projects: admins delete"
  ON public.projects FOR DELETE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );


-- ----------------------------------------------------------------
-- units
-- Org check is a join through projects (no direct org FK on units).
-- ----------------------------------------------------------------

-- Internal staff see all units in their org's projects.
CREATE POLICY "units: staff see own org"
  ON public.units FOR SELECT
  USING (
    public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE  organization_id = public.get_user_organization_id()
    )
  );

-- Clients see only the unit(s) they have booked.
CREATE POLICY "units: clients see own booked unit"
  ON public.units FOR SELECT
  USING (
    public.get_user_role() = 'client'
    AND id IN (
      SELECT unit_id FROM public.bookings
      WHERE  client_profile_id = auth.uid()
    )
  );

-- Admins and managers insert/update units.
CREATE POLICY "units: managers insert"
  ON public.units FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'sales_manager')
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE  organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "units: managers update"
  ON public.units FOR UPDATE
  USING (
    public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE  organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE  organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "units: admins delete"
  ON public.units FOR DELETE
  USING (
    public.get_user_role() = 'admin'
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE  organization_id = public.get_user_organization_id()
    )
  );


-- ----------------------------------------------------------------
-- leads
-- Clients have no access to leads (internal sales data).
-- ----------------------------------------------------------------

CREATE POLICY "leads: staff see own org"
  ON public.leads FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  );

CREATE POLICY "leads: staff insert"
  ON public.leads FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  );

CREATE POLICY "leads: staff update"
  ON public.leads FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  );

CREATE POLICY "leads: managers delete"
  ON public.leads FOR DELETE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );


-- ----------------------------------------------------------------
-- lead_activities
-- Append-only. Org check is a join through leads.
-- Clients have no access.
-- ----------------------------------------------------------------

CREATE POLICY "lead_activities: staff see own org"
  ON public.lead_activities FOR SELECT
  USING (
    public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
    AND lead_id IN (
      SELECT id FROM public.leads
      WHERE  organization_id = public.get_user_organization_id()
    )
  );

-- Any staff member may log an activity on a lead in their org.
CREATE POLICY "lead_activities: staff insert"
  ON public.lead_activities FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
    AND lead_id IN (
      SELECT id FROM public.leads
      WHERE  organization_id = public.get_user_organization_id()
    )
  );

-- Activities are intentionally immutable: no UPDATE/DELETE policies.


-- ----------------------------------------------------------------
-- bookings
-- ----------------------------------------------------------------

-- Internal staff see all bookings in their org.
CREATE POLICY "bookings: staff see own org"
  ON public.bookings FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  );

-- Clients see only their own bookings.
CREATE POLICY "bookings: clients see own"
  ON public.bookings FOR SELECT
  USING (
    client_profile_id = auth.uid()
    AND public.get_user_role() = 'client'
  );

CREATE POLICY "bookings: managers insert"
  ON public.bookings FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

CREATE POLICY "bookings: managers update"
  ON public.bookings FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

-- Bookings are never hard-deleted (cancel via status change).
-- No DELETE policy intentionally.


-- ----------------------------------------------------------------
-- payment_milestones
-- ----------------------------------------------------------------

-- Internal staff see all milestones for their org's bookings.
CREATE POLICY "payment_milestones: staff see own org"
  ON public.payment_milestones FOR SELECT
  USING (
    public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
    AND booking_id IN (
      SELECT id FROM public.bookings
      WHERE  organization_id = public.get_user_organization_id()
    )
  );

-- Clients see milestones only for their own bookings.
CREATE POLICY "payment_milestones: clients see own bookings"
  ON public.payment_milestones FOR SELECT
  USING (
    public.get_user_role() = 'client'
    AND booking_id IN (
      SELECT id FROM public.bookings
      WHERE  client_profile_id = auth.uid()
    )
  );

CREATE POLICY "payment_milestones: managers insert"
  ON public.payment_milestones FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'sales_manager')
    AND booking_id IN (
      SELECT id FROM public.bookings
      WHERE  organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "payment_milestones: managers update"
  ON public.payment_milestones FOR UPDATE
  USING (
    public.get_user_role() IN ('admin', 'sales_manager')
    AND booking_id IN (
      SELECT id FROM public.bookings
      WHERE  organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('admin', 'sales_manager')
    AND booking_id IN (
      SELECT id FROM public.bookings
      WHERE  organization_id = public.get_user_organization_id()
    )
  );


-- ----------------------------------------------------------------
-- documents
-- ----------------------------------------------------------------

-- Internal staff see all documents in their org.
CREATE POLICY "documents: staff see own org"
  ON public.documents FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  );

-- Clients see documents that are:
--   a) marked visible_to_client = true, AND
--   b) either linked to one of their bookings OR are org-level docs (booking_id IS NULL)
CREATE POLICY "documents: clients see visible docs"
  ON public.documents FOR SELECT
  USING (
    public.get_user_role() = 'client'
    AND visible_to_client = true
    AND (
      booking_id IS NULL   -- org-level doc (brochures, RERA certs) — all clients can see
      OR booking_id IN (
        SELECT id FROM public.bookings
        WHERE  client_profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "documents: staff insert"
  ON public.documents FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager', 'salesperson')
  );

-- Only managers may change visibility or delete documents.
CREATE POLICY "documents: managers update"
  ON public.documents FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

CREATE POLICY "documents: managers delete"
  ON public.documents FOR DELETE
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );


-- ================================================================
-- 8. INDEXES
--
-- Rule: index every FK, every status/score column used in
-- WHERE clauses, and (organization_id, status) composites
-- used in the most common list queries.
-- ================================================================

-- organizations
CREATE INDEX idx_organizations_slug            ON public.organizations (slug);

-- profiles
CREATE INDEX idx_profiles_organization_id      ON public.profiles (organization_id);
CREATE INDEX idx_profiles_role                 ON public.profiles (role);

-- projects
CREATE INDEX idx_projects_organization_id      ON public.projects (organization_id);
CREATE INDEX idx_projects_status               ON public.projects (status);
CREATE INDEX idx_projects_org_status           ON public.projects (organization_id, status);

-- units
CREATE INDEX idx_units_project_id              ON public.units (project_id);
CREATE INDEX idx_units_status                  ON public.units (status);
CREATE INDEX idx_units_project_status          ON public.units (project_id, status);
CREATE INDEX idx_units_blocked_by              ON public.units (blocked_by)   WHERE blocked_by IS NOT NULL;
CREATE INDEX idx_units_sold_to                 ON public.units (sold_to)      WHERE sold_to IS NOT NULL;

-- leads
CREATE INDEX idx_leads_organization_id         ON public.leads (organization_id);
CREATE INDEX idx_leads_project_id              ON public.leads (project_id)   WHERE project_id IS NOT NULL;
CREATE INDEX idx_leads_assigned_to             ON public.leads (assigned_to)  WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_leads_status                  ON public.leads (status);
CREATE INDEX idx_leads_score                   ON public.leads (score);
CREATE INDEX idx_leads_source                  ON public.leads (source);
CREATE INDEX idx_leads_org_status              ON public.leads (organization_id, status);
CREATE INDEX idx_leads_org_score               ON public.leads (organization_id, score);
CREATE INDEX idx_leads_last_contacted_at       ON public.leads (last_contacted_at);
CREATE INDEX idx_leads_created_at              ON public.leads (created_at DESC);

-- lead_activities
CREATE INDEX idx_lead_activities_lead_id       ON public.lead_activities (lead_id);
CREATE INDEX idx_lead_activities_performed_by  ON public.lead_activities (performed_by);
CREATE INDEX idx_lead_activities_type          ON public.lead_activities (activity_type);
CREATE INDEX idx_lead_activities_scheduled_at  ON public.lead_activities (scheduled_at)
  WHERE scheduled_at IS NOT NULL;              -- partial index for follow-up queries

-- bookings
CREATE INDEX idx_bookings_organization_id      ON public.bookings (organization_id);
CREATE INDEX idx_bookings_unit_id              ON public.bookings (unit_id);
CREATE INDEX idx_bookings_lead_id              ON public.bookings (lead_id)     WHERE lead_id IS NOT NULL;
CREATE INDEX idx_bookings_client_profile_id    ON public.bookings (client_profile_id);
CREATE INDEX idx_bookings_status               ON public.bookings (status);
CREATE INDEX idx_bookings_booking_date         ON public.bookings (booking_date DESC);
CREATE INDEX idx_bookings_org_status           ON public.bookings (organization_id, status);

-- payment_milestones
CREATE INDEX idx_milestones_booking_id         ON public.payment_milestones (booking_id);
CREATE INDEX idx_milestones_status             ON public.payment_milestones (status);
CREATE INDEX idx_milestones_due_date           ON public.payment_milestones (due_date)
  WHERE status IN ('upcoming', 'due', 'overdue'); -- partial: skip paid milestones
CREATE INDEX idx_milestones_reminder_sent      ON public.payment_milestones (reminder_sent)
  WHERE reminder_sent = false;                  -- partial: only unsent reminders

-- documents
CREATE INDEX idx_documents_organization_id     ON public.documents (organization_id);
CREATE INDEX idx_documents_booking_id          ON public.documents (booking_id)  WHERE booking_id IS NOT NULL;
CREATE INDEX idx_documents_uploaded_by         ON public.documents (uploaded_by);
CREATE INDEX idx_documents_type                ON public.documents (document_type);
CREATE INDEX idx_documents_visible_to_client   ON public.documents (visible_to_client)
  WHERE visible_to_client = true;              -- partial: client portal queries only hit true rows

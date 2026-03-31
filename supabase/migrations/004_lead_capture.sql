-- Add api_key column to organizations for external lead capture authentication.
-- DEFAULT gen_random_uuid()::text auto-populates all existing rows on migration.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS api_key text UNIQUE DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS organizations_api_key_idx
  ON public.organizations (api_key);

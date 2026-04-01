-- ============================================================
-- 007_fix_rls_recursion.sql
--
-- Root cause: "projects: clients see booked projects" has an
-- EXISTS subquery that joins `units`.  The `units` staff SELECT
-- policy in turn has a subquery back to `projects`, creating an
-- infinite recursion (PostgreSQL error 42P17).
--
-- Fix: wrap the booked-project check in a SECURITY DEFINER
-- function so the inner query on units/bookings bypasses RLS,
-- breaking the cycle.
-- ============================================================

-- 1. Helper: does the calling user have a booking for this project?
--    SECURITY DEFINER means the function runs as its owner and
--    skips RLS on bookings/units, so no recursive policy chain.

CREATE OR REPLACE FUNCTION public.client_has_booking_for_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.bookings b
    JOIN   public.units    u ON u.id = b.unit_id
    WHERE  b.client_profile_id = auth.uid()
      AND  u.project_id = p_project_id
  );
$$;

COMMENT ON FUNCTION public.client_has_booking_for_project(uuid) IS
  'Returns true when the current user (client) has at least one booking
   for a unit in the given project.  SECURITY DEFINER bypasses RLS on
   units/bookings to prevent infinite recursion with the projects policy.';


-- 2. Replace the policy that caused the cycle.

DROP POLICY IF EXISTS "projects: clients see booked projects" ON public.projects;

CREATE POLICY "projects: clients see booked projects"
  ON public.projects FOR SELECT
  USING (
    public.get_user_role() = 'client'
    AND public.client_has_booking_for_project(id)
  );

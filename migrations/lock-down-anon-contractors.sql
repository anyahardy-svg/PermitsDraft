-- Step 2: Stop anonymous (and direct PostgREST) reads of contractor PII.
-- Run in Supabase SQL Editor ONLY AFTER:
--   1) contractor-data Edge Function is deployed (ping returns v1+)
--   2) Production frontend uses src/api/contractorData.js for admin + kiosk lists
--
-- Admins: full roster via Edge (service role) + requestingAdminId.
-- Contractors (Supabase Auth): read/update people in their company via RLS below.
-- Anon: no access to contractors.

ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors FORCE ROW LEVEL SECURITY;

-- Drop permissive policies (names differ across environments).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contractors'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contractors', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.contractors FROM anon;

-- Company membership for the signed-in contractor (auth.users email).
CREATE OR REPLACE FUNCTION public.current_contractor_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT company_id
  FROM public.contractors
  WHERE company_id IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

REVOKE ALL ON FUNCTION public.current_contractor_company_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_contractor_company_ids() TO authenticated;

CREATE POLICY "authenticated_read_own_contractor"
  ON public.contractors
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY "authenticated_read_company_roster"
  ON public.contractors
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT public.current_contractor_company_ids()));

CREATE POLICY "authenticated_update_company_roster"
  ON public.contractors
  FOR UPDATE
  TO authenticated
  USING (company_id IN (SELECT public.current_contractor_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_contractor_company_ids()));

CREATE POLICY "authenticated_insert_company_roster"
  ON public.contractors
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id IN (SELECT public.current_contractor_company_ids()));

CREATE POLICY "authenticated_delete_company_roster"
  ON public.contractors
  FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT public.current_contractor_company_ids()));

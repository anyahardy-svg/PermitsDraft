-- Step 2b: Stop anonymous (and direct PostgREST) reads of company PII.
-- Run in Supabase SQL Editor ONLY AFTER:
--   1) company-data Edge Function is deployed (ping returns 2026-09-26-v1+)
--   2) Production frontend uses src/api/companyData.js + companies.js for admin + kiosk paths
--
-- Admins: full access via Edge (service role) + requestingAdminId.
-- Contractors (Supabase Auth): read/update their organisation via RLS below.
-- Anon: no access to companies.

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'companies'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.companies', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.companies FROM anon;

-- Reuses contractor membership helper from lock-down-anon-contractors.sql
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

CREATE POLICY "authenticated_read_own_company"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.current_contractor_company_ids()));

CREATE POLICY "authenticated_update_own_company"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (id IN (SELECT public.current_contractor_company_ids()))
  WITH CHECK (id IN (SELECT public.current_contractor_company_ids()));

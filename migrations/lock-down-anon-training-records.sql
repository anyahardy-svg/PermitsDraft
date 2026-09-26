-- Step 2c: Stop anonymous (and direct PostgREST) reads of training_records (files metadata + URLs).
-- Run in Supabase SQL Editor ONLY AFTER:
--   1) company-data Edge Function is deployed (ping returns 2026-09-26-v5+ with training record actions)
--   2) Production frontend uses src/api/trainingRecordsData.js (invokes company-data) for admin paths
--   3) Contractor hub still uses Supabase Auth JWT + RLS below for uploads/listing
--
-- Admins: CRUD via Edge (service role) + requestingAdminId.
-- Contractors (Supabase Auth): rows for people in their company via RLS below.
-- Anon: no access to training_records.

ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'training_records'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_records', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.training_records FROM anon;

-- Requires lock-down-anon-contractors.sql (current_contractor_company_ids).
CREATE OR REPLACE FUNCTION public.contractor_ids_in_my_companies()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.contractors c
  WHERE c.company_id IN (SELECT public.current_contractor_company_ids());
$$;

REVOKE ALL ON FUNCTION public.contractor_ids_in_my_companies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contractor_ids_in_my_companies() TO authenticated;

CREATE POLICY "authenticated_select_company_training_records"
  ON public.training_records
  FOR SELECT
  TO authenticated
  USING (contractor_id IN (SELECT public.contractor_ids_in_my_companies()));

CREATE POLICY "authenticated_insert_company_training_records"
  ON public.training_records
  FOR INSERT
  TO authenticated
  WITH CHECK (contractor_id IN (SELECT public.contractor_ids_in_my_companies()));

CREATE POLICY "authenticated_update_company_training_records"
  ON public.training_records
  FOR UPDATE
  TO authenticated
  USING (contractor_id IN (SELECT public.contractor_ids_in_my_companies()))
  WITH CHECK (contractor_id IN (SELECT public.contractor_ids_in_my_companies()));

CREATE POLICY "authenticated_delete_company_training_records"
  ON public.training_records
  FOR DELETE
  TO authenticated
  USING (contractor_id IN (SELECT public.contractor_ids_in_my_companies()));

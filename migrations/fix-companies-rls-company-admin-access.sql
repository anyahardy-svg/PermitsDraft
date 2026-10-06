-- Extend company RLS so accreditation contacts can save uploads, not only field contractors.
-- Run in Supabase SQL Editor after add-company-admin-access.sql and lock-down-anon-companies.sql.
--
-- Symptom: admin_staff / invitation logins can open accreditation and upload files to storage,
-- but totika_certificate_url, companies.attachments, etc. never persist (PostgREST UPDATE blocked).

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
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  UNION
  SELECT company_id
  FROM public.company_admin_access
  WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  UNION
  SELECT id
  FROM public.companies
  WHERE lower(coalesce(contact_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
     OR lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

REVOKE ALL ON FUNCTION public.current_contractor_company_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_contractor_company_ids() TO authenticated;

-- Rollback (restores pre-fix behaviour; only if you must revert):
-- Redefine current_contractor_company_ids() using the body from
-- migrations/lock-down-anon-companies.sql (contractors table only).
-- Field contractors and existing site-manager flows are unchanged by this migration;
-- it only adds the same company membership paths already used for ContractorHQ login.

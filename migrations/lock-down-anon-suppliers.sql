-- Step 2d: Stop anonymous (direct PostgREST) access to supplier PII.
-- Run in Supabase SQL Editor ONLY AFTER:
--   1) Production frontend uses Vercel supplier APIs (see docs/security/DEPLOY_SUPPLIERS_LOCKDOWN.md)
--   2) Smoke test: admin supplier list, invite, accreditation form (admin + public token link)
--
-- Admins + public token flows: Vercel API routes (service role).
-- Suppliers are not on contractor anon auth; no authenticated contractor policies required here.
-- Authenticated Supabase users (supplier_admin JWT metadata) keep existing policies if present.

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.supplier_accreditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_accreditations FORCE ROW LEVEL SECURITY;

-- Policies added for custom admin panel (anon key) — remove before revoke.
DROP POLICY IF EXISTS supplier_accreditation_suppliers_select_anon ON public.suppliers;
DROP POLICY IF EXISTS supplier_accreditations_select_anon ON public.supplier_accreditations;
DROP POLICY IF EXISTS supplier_accreditations_update_anon ON public.supplier_accreditations;
DROP POLICY IF EXISTS supplier_accreditations_insert_anon ON public.supplier_accreditations;

REVOKE ALL ON TABLE public.suppliers FROM anon;
REVOKE ALL ON TABLE public.supplier_accreditations FROM anon;

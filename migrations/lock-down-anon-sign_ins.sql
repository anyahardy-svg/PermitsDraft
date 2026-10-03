-- Step 2f: Stop anonymous PostgREST access to sign-in register (visitor/contractor presence PII).
-- Run in Supabase SQL Editor ONLY AFTER:
--   1) Production Vercel deploy with kiosk-sign-ins + manager-sign-in-history + kiosk-check-in (subdomain scope)
--   2) Smoke test: contractor check-in, visitor check-in, sign-out, on-site list, manager history search
--
-- Kiosk + manager: Vercel APIs (service role). Cron auto-signout already uses service role.

ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sign_ins FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sign_ins'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sign_ins', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.sign_ins FROM anon;

-- Stop anon/authenticated from reading admin_users (including password_hash).
-- Run in Supabase SQL Editor AFTER admin-auth login works (v7+).
-- Service role (Edge Functions) still has full access.

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;

-- Drop every policy on admin_users (names differ across environments).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_users', pol.policyname);
  END LOOP;
END $$;

-- Remove table-level grants that bypass RLS when RLS is misconfigured.
REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE ALL ON TABLE public.admin_users FROM authenticated;

-- No new permissive policies: anon/authenticated get zero rows / permission denied.
-- Edge Functions use service_role and bypass RLS.

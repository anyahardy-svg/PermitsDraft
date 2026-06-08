-- Allow authenticated contractors to read their own row when logging in.
-- Run this in Supabase SQL editor if contractor login profile lookup is blocked by RLS.

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_read_own_contractor" ON contractors;

CREATE POLICY "authenticated_users_read_own_contractor"
  ON contractors
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

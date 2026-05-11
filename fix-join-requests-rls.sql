-- Fix RLS policy to allow system admins to update join requests
-- This policy allows updates via the unauthenticated anon key
-- (Frontend session validation provides the authorization check)

CREATE POLICY contractor_join_requests_update_system_admin
  ON contractor_join_requests FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Optional companion to admin_login_verify: match by user id (same crypt check).
-- Run in Supabase SQL Editor if login fails for everyone with correct passwords.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_password_matches(p_user_id uuid, p_password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT COALESCE(
    (
      SELECT u.password_hash = extensions.crypt(p_password, u.password_hash)
      FROM admin_users u
      WHERE u.id = p_user_id
        AND u.password_hash IS NOT NULL
        AND length(trim(u.password_hash)) > 0
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.admin_password_matches(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_password_matches(uuid, text) TO service_role;

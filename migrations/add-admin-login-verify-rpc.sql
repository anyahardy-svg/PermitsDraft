-- Verify admin passwords in Postgres (pgcrypto), not in the Edge runtime.
-- Run in Supabase SQL Editor before relying on admin-auth login (v7+).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_login_verify(p_email text, p_password text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  site_ids uuid[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT u.id, u.email, u.name, u.role, u.site_ids
  FROM admin_users u
  WHERE lower(u.email) = lower(trim(p_email))
    AND u.password_hash IS NOT NULL
    AND length(u.password_hash) > 0
    AND u.password_hash = extensions.crypt(p_password, u.password_hash);
$$;

REVOKE ALL ON FUNCTION public.admin_login_verify(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_login_verify(text, text) TO service_role;

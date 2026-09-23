-- Run this ENTIRE file once in Supabase → SQL Editor (same project as VITE_SUPABASE_URL).
-- Required for admin login after locking down admin_users. Without it, correct passwords always fail.

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

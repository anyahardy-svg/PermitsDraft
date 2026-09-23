-- TODAY FIX (part 1): Stop anon/public from reading admin_users (including password_hash).
-- Run in Supabase Dashboard → SQL Editor AFTER deploying the admin-auth Edge Function.
--
-- Effect: Browser + anon key can no longer SELECT/UPDATE admin_users.
-- Admin login, kiosk admin list, and password setup use the admin-auth Edge Function (service role).

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow public select admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow super_admin to manage admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin to manage users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin to update users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin to delete users" ON admin_users;
DROP POLICY IF EXISTS "Allow all admin operations" ON admin_users;

-- Intentionally no permissive policies for anon or authenticated on admin_users.
-- Service role (Edge Functions) bypasses RLS.

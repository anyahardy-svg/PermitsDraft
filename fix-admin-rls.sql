-- First, disable RLS temporarily to debug
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies if they exist
DROP POLICY IF EXISTS "Allow read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow super_admin to manage admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow public select admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin to manage users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin to update users" ON admin_users;
DROP POLICY IF EXISTS "Allow admin to delete users" ON admin_users;

-- Re-enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Simple policy: allow all operations (for internal admin tool)
CREATE POLICY "Allow all admin operations" ON admin_users
  FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS on admin_users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to SELECT admin users (needed for login)
CREATE POLICY "Allow public select admin_users" ON admin_users
  FOR SELECT
  USING (true);

-- Policy 2: Allow inserts only if we have a valid auth context (admin creating users)
-- For now, allow inserts with service role - we'll tighten this later
CREATE POLICY "Allow admin to manage users" ON admin_users
  FOR INSERT
  WITH CHECK (true);

-- Policy 3: Allow updates for password changes and user management
CREATE POLICY "Allow admin to update users" ON admin_users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy 4: Allow deletes for user management
CREATE POLICY "Allow admin to delete users" ON admin_users
  FOR DELETE
  USING (true);

-- Create admin_users table for admin authentication and role management
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('super_admin', 'manager')),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Add RLS policies for security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read admin_users (for login)
CREATE POLICY "Allow read admin_users" ON admin_users
  FOR SELECT USING (true);

-- Allow super_admins to manage admin_users
CREATE POLICY "Allow super_admin to manage admin_users" ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE role = 'super_admin'
      LIMIT 1
    )
  );

-- Add password reset token columns to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_admin_password_reset_token ON admin_users(password_reset_token);

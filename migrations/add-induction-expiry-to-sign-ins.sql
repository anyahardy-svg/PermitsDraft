-- Add induction expiry date tracking to sign_ins table
-- This allows us to see when inductions expire in the sign-in register

ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS induction_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for expiry queries
CREATE INDEX IF NOT EXISTS idx_sign_ins_induction_expires_at ON sign_ins(induction_expires_at);

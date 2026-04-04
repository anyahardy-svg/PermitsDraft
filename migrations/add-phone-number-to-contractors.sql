-- Migration: Add phone_number column to contractors table
-- Purpose: Store contractor phone numbers for profile management and contact information

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contractors_email ON contractors(email);
CREATE INDEX IF NOT EXISTS idx_contractors_phone ON contractors(phone_number);

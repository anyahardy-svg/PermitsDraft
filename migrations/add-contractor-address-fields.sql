-- Add address fields to contractors table
-- Migration: Add Contractor Address Fields

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS address_1 TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS address_postcode TEXT;

-- Create indexes for commonly searched address fields
CREATE INDEX IF NOT EXISTS idx_contractors_address_city ON contractors(address_city);
CREATE INDEX IF NOT EXISTS idx_contractors_address_postcode ON contractors(address_postcode);

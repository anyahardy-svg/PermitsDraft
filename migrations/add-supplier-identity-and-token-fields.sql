-- Migration: Supplier identity fields and accreditation access token
-- Purpose: Match company basics on suppliers table; enable token-link form access
-- Date: June 12, 2026

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_surname TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS nzbn TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address_1 TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address_postcode TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS accreditation_token TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS accreditation_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_accreditation_token
  ON suppliers (accreditation_token)
  WHERE accreditation_token IS NOT NULL;

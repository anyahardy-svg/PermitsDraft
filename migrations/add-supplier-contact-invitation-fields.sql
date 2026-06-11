-- Migration: Add supplier contact and invitation tracking fields
-- Purpose: Support supplier invite and CSV import from the admin panel
-- Date: June 10, 2026

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tech_contact_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS accreditation_deadline DATE;

CREATE INDEX IF NOT EXISTS idx_suppliers_contact_email
  ON suppliers (contact_email);

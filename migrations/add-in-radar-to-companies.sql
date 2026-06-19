-- Migration: Add in_radar flag to companies table
-- Purpose: Track whether a company is on the RADAR list (default true; cleared on accreditation approval)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS in_radar BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_companies_in_radar ON companies(in_radar);

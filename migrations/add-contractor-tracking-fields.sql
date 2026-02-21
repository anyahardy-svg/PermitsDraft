-- Migration: Add tracking fields to contractors table
-- Purpose: Track which contractors had company manually entered (vs selected from dropdown)
-- and which business units they were assigned to when created

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS company_manually_entered BOOLEAN DEFAULT false;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS created_at_business_unit_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_contractors_company_manually_entered ON contractors(company_manually_entered);

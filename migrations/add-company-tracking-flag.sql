-- Migration: Add manually_created flag to companies table
-- Purpose: Track which companies were created via manual text entry (not from selection)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS manually_created BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_manually_created ON companies(manually_created);

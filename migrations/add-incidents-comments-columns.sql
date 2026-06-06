-- Migration: Add comment columns for incidents_breaches
-- Purpose: Store explanation comments for Yes answers to pending prosecutions and environmental notices

ALTER TABLE companies ADD COLUMN IF NOT EXISTS pending_prosecutions_comments TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_notices_comments TEXT;

-- Create indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_companies_pending_prosecutions_comments ON companies(pending_prosecutions_comments);
CREATE INDEX IF NOT EXISTS idx_companies_environmental_notices_comments ON companies(environmental_notices_comments);

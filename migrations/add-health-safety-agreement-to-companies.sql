-- Migration: Add Health & Safety Agreement Fields to Companies Table
-- Purpose: Support Section 26 digital signature and agreement tracking
-- Date: May 10, 2026

-- ============================================================================
-- SECTION 26: Health & Safety Agreement
-- ============================================================================

-- H&S agreement document content (reference/cache)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_document_content TEXT;

-- Digital signature image (PNG data URL)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_signature TEXT;

-- Name of person who signed
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_accepted_by TEXT;

-- Whether they acknowledged the agreement
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_acknowledged BOOLEAN DEFAULT FALSE;

-- When the agreement was signed/accepted
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for agreement tracking
CREATE INDEX IF NOT EXISTS idx_companies_hs_agreement_acknowledged ON companies(hs_agreement_acknowledged);
CREATE INDEX IF NOT EXISTS idx_companies_hs_agreement_accepted_at ON companies(hs_agreement_accepted_at);

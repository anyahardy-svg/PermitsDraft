-- Add Section 22: Environmental Management columns to companies table
-- These columns store environmental assessment data for companies without ISO 14001 certification

ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_aspects_assessment_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_aspects_assessment_score INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_aspects_assessment_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_system_and_plans_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_system_and_plans_score INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_system_and_plans_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS waste_management_policy_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS waste_management_policy_score INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS waste_management_policy_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_improvement_targets_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_improvement_targets_score INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_improvement_targets_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_training_programme_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_training_programme_score INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_training_programme_evidence_url TEXT;

-- Add comment to document Section 22
COMMENT ON TABLE companies IS 'Companies table with accreditation and assessment data. Section 22 (Environmental Management) data stored in environmental_* columns, shown when ISO 14001 is not certified.';

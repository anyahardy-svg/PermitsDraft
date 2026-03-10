-- Migration: Add Quality Management fields (Section 14) for when ISO 9001 is not certified
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_manager_and_plan_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_manager_and_plan_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_manager_and_plan_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS roles_and_responsibilities_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS roles_and_responsibilities_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS roles_and_responsibilities_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS purchasing_procedures_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS purchasing_procedures_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS purchasing_procedures_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS subcontractor_evaluation_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subcontractor_evaluation_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subcontractor_evaluation_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS process_control_plan_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS process_control_plan_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS process_control_plan_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS nonconformance_procedure_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nonconformance_procedure_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nonconformance_procedure_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS product_rejection_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS product_rejection_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS product_rejection_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS personnel_induction_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS personnel_induction_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS personnel_induction_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_audits_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_audits_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_audits_evidence_url TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS continuous_improvement_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS continuous_improvement_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS continuous_improvement_evidence_url TEXT;

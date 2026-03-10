-- Migration: Fix Section 18 column names (rename or create as needed)
-- This handles the transition from incident_investigation_process/corrective_actions 
-- to injury_management/early_intervention

-- For injury_management columns
DO $$ 
BEGIN
  -- Try to rename old column if it exists
  BEGIN
    ALTER TABLE companies RENAME COLUMN incident_investigation_process_exists TO injury_management_exists;
  EXCEPTION WHEN OTHERS THEN
    -- Column doesn't exist or is already named correctly, try to create if missing
    BEGIN
      ALTER TABLE companies ADD COLUMN injury_management_exists BOOLEAN DEFAULT FALSE;
    EXCEPTION WHEN OTHERS THEN
      -- Column already exists, skip
      NULL;
    END;
  END;
END $$;

DO $$ 
BEGIN
  BEGIN
    ALTER TABLE companies RENAME COLUMN incident_investigation_process_score TO injury_management_score;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER TABLE companies ADD COLUMN injury_management_score INT DEFAULT 0;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END $$;

DO $$ 
BEGIN
  BEGIN
    ALTER TABLE companies RENAME COLUMN incident_investigation_process_evidence_url TO injury_management_evidence_url;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER TABLE companies ADD COLUMN injury_management_evidence_url TEXT;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END $$;

-- For early_intervention columns
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE companies RENAME COLUMN corrective_actions_exists TO early_intervention_exists;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER TABLE companies ADD COLUMN early_intervention_exists BOOLEAN DEFAULT FALSE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END $$;

DO $$ 
BEGIN
  BEGIN
    ALTER TABLE companies RENAME COLUMN corrective_actions_score TO early_intervention_score;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER TABLE companies ADD COLUMN early_intervention_score INT DEFAULT 0;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END $$;

DO $$ 
BEGIN
  BEGIN
    ALTER TABLE companies RENAME COLUMN corrective_actions_evidence_url TO early_intervention_evidence_url;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER TABLE companies ADD COLUMN early_intervention_evidence_url TEXT;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END $$;

-- Ensure Section 21 Quality Management columns exist
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

-- Ensure Section 20 incident tracking columns exist
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fatalities TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS serious_harm TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lost_time TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS property_damage TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pending_prosecutions TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS prosecutions_5_years TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS incidents_breaches_score INT DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS incidents_breaches_evidence_url TEXT;

-- Migration: Copy data from old column names to new column names (Section 18)
-- This ensures data is preserved when column names change

-- Copy injury_management data
UPDATE companies SET injury_management_exists = incident_investigation_process_exists 
WHERE incident_investigation_process_exists IS NOT NULL AND injury_management_exists IS NULL;

UPDATE companies SET injury_management_score = incident_investigation_process_score 
WHERE incident_investigation_process_score IS NOT NULL AND injury_management_score IS NULL;

UPDATE companies SET injury_management_evidence_url = incident_investigation_process_evidence_url 
WHERE incident_investigation_process_evidence_url IS NOT NULL AND injury_management_evidence_url IS NULL;

-- Copy early_intervention data
UPDATE companies SET early_intervention_exists = corrective_actions_exists 
WHERE corrective_actions_exists IS NOT NULL AND early_intervention_exists IS NULL;

UPDATE companies SET early_intervention_score = corrective_actions_score 
WHERE corrective_actions_score IS NOT NULL AND early_intervention_score IS NULL;

UPDATE companies SET early_intervention_evidence_url = corrective_actions_evidence_url 
WHERE corrective_actions_evidence_url IS NOT NULL AND early_intervention_evidence_url IS NULL;

-- Migration: Rename Section 18 fields from Incident Analysis to Injury Management
-- ============================================================================

-- Rename incident_investigation_process columns to injury_management
ALTER TABLE companies 
RENAME COLUMN incident_investigation_process_exists TO injury_management_exists;

ALTER TABLE companies 
RENAME COLUMN incident_investigation_process_score TO injury_management_score;

ALTER TABLE companies 
RENAME COLUMN incident_investigation_process_evidence_url TO injury_management_evidence_url;

-- Rename corrective_actions columns to early_intervention
ALTER TABLE companies 
RENAME COLUMN corrective_actions_exists TO early_intervention_exists;

ALTER TABLE companies 
RENAME COLUMN corrective_actions_score TO early_intervention_score;

ALTER TABLE companies 
RENAME COLUMN corrective_actions_evidence_url TO early_intervention_evidence_url;

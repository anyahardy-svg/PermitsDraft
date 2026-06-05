-- Migration: Add library_item_id tracking columns to companies table
-- Purpose: Track which documents are from the evidence library vs direct uploads
-- Allows smart deletion: library items are removed from association, direct uploads delete files
-- 
-- Note: 
-- - Evidence items (sections 4-22): CAN be chosen from library
-- - Certificates (section 3): Currently direct uploads only (column unused but included for schema consistency)
-- - Policies (section 4): Currently direct uploads only (column unused but included for schema consistency)
-- - Insurance (section 24): Always direct uploads only (column unused but included for schema consistency)
-- 
-- Date: June 5, 2026

-- ============================================================================
-- SECTION 3: Certificate Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS aep_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_45001_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS totika_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS she_prequal_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS impac_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sitewise_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rapid_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_9001_certificate_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_14001_certificate_library_item_id UUID;

-- ============================================================================
-- SECTION 4: Policy Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_safety_policy_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_policy_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS drug_alcohol_policy_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_policy_library_item_id UUID;

-- ============================================================================
-- SECTION 4 & 5: Accident & Health Hazard Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_reporting_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_investigation_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_hazard_plan_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exposure_monitoring_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS respiratory_training_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exhaust_ventilation_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_monitoring_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 6: Induction & Training Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS induction_programme_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS induction_records_process_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS skills_training_list_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS competency_testing_system_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 7: Hazard Identification & Management Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS hazard_identification_process_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS jha_jsea_system_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS risk_registers_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 8: PPE Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS ppe_training_maintenance_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ppe_job_assessment_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ppe_maintenance_schedule_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 9: Plant & Equipment Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS plant_equipment_licenses_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plant_equipment_safety_provisions_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plant_equipment_maintenance_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 10: Electrical Equipment Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS electrical_equipment_testing_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS electrical_equipment_licenses_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS electrical_equipment_safety_provisions_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS electrical_equipment_maintenance_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 11: Emergency Preparedness Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS emergency_procedures_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 12: Site Specific Safety Plans Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS site_safety_plans_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS site_induction_process_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 13: Contractor Management Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS contractor_induction_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contractor_compliance_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 14: Health & Wellbeing Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_wellbeing_program_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fatigue_management_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 15: Competency & Qualifications Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS competency_framework_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 16: Communication & Reporting Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS safety_communication_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS near_miss_reporting_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 17: Performance & Review Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS performance_monitoring_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS regular_audits_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 18: Injury Management Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS injury_management_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS early_intervention_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 19: Continuous Improvement Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS safety_objectives_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS management_review_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 20: Incidents & Breaches Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS incidents_breaches_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 21: Quality Management Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_manager_and_plan_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS roles_and_responsibilities_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS purchasing_procedures_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subcontractor_evaluation_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS process_control_plan_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nonconformance_procedure_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS product_rejection_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS personnel_induction_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_audits_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS continuous_improvement_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 22: Environmental Management Evidence Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_aspects_assessment_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_system_and_plans_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS waste_management_policy_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_improvement_targets_evidence_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_training_programme_evidence_library_item_id UUID;

-- ============================================================================
-- SECTION 24: Insurance Documents Library Item IDs
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS public_liability_insurance_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS motor_vehicle_insurance_library_item_id UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS professional_indemnity_insurance_library_item_id UUID;

-- ============================================================================
-- Add Foreign Key Constraints (optional but recommended)
-- ============================================================================

-- Reference the evidence_library_items table to ensure referential integrity
ALTER TABLE companies ADD CONSTRAINT fk_aep_cert_library 
  FOREIGN KEY (aep_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_iso45001_cert_library 
  FOREIGN KEY (iso_45001_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_totika_cert_library 
  FOREIGN KEY (totika_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_sheprequal_cert_library 
  FOREIGN KEY (she_prequal_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_impac_cert_library 
  FOREIGN KEY (impac_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_sitewise_cert_library 
  FOREIGN KEY (sitewise_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_rapid_cert_library 
  FOREIGN KEY (rapid_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_iso9001_cert_library 
  FOREIGN KEY (iso_9001_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_iso14001_cert_library 
  FOREIGN KEY (iso_14001_certificate_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_hs_policy_library 
  FOREIGN KEY (health_safety_policy_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_env_policy_library 
  FOREIGN KEY (environmental_policy_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_drug_policy_library 
  FOREIGN KEY (drug_alcohol_policy_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_quality_policy_library 
  FOREIGN KEY (quality_policy_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_pli_insurance_library 
  FOREIGN KEY (public_liability_insurance_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_mvi_insurance_library 
  FOREIGN KEY (motor_vehicle_insurance_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

ALTER TABLE companies ADD CONSTRAINT fk_pii_insurance_library 
  FOREIGN KEY (professional_indemnity_insurance_library_item_id) REFERENCES evidence_library_items(id) ON DELETE SET NULL;

-- Note: Adding foreign key constraints for all 60+ evidence columns would be excessive
-- Instead, rely on application-level validation via the API

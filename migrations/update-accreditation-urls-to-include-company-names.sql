-- Migration: Update Accreditation URLs to Include Company Names
-- Purpose: Update certificate URLs to reflect new file path structure with company names
-- Format: {companyName}/{certificationType}/{timestamp}.{ext}
-- Note: This assumes files have already been moved in Supabase Storage to the new naming convention

-- Helper function to sanitize company names
CREATE OR REPLACE FUNCTION sanitize_company_name(name TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(
    BOTH '_' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '_', 'g'),
      '_+', '_', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update AEP Certificate URLs
UPDATE companies
SET aep_certificate_url = 
  REPLACE(
    aep_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE aep_certificate_url IS NOT NULL 
  AND aep_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update ISO 45001 Certificate URLs
UPDATE companies
SET iso_45001_certificate_url = 
  REPLACE(
    iso_45001_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE iso_45001_certificate_url IS NOT NULL 
  AND iso_45001_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update Totika Certificate URLs
UPDATE companies
SET totika_certificate_url = 
  REPLACE(
    totika_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE totika_certificate_url IS NOT NULL 
  AND totika_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update SHE Prequal Certificate URLs
UPDATE companies
SET she_prequal_certificate_url = 
  REPLACE(
    she_prequal_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE she_prequal_certificate_url IS NOT NULL 
  AND she_prequal_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update IMPAC Certificate URLs
UPDATE companies
SET impac_certificate_url = 
  REPLACE(
    impac_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE impac_certificate_url IS NOT NULL 
  AND impac_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update SiteWise Certificate URLs
UPDATE companies
SET sitewise_certificate_url = 
  REPLACE(
    sitewise_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE sitewise_certificate_url IS NOT NULL 
  AND sitewise_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update RAPID Certificate URLs
UPDATE companies
SET rapid_certificate_url = 
  REPLACE(
    rapid_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE rapid_certificate_url IS NOT NULL 
  AND rapid_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update ISO 9001 Certificate URLs
UPDATE companies
SET iso_9001_certificate_url = 
  REPLACE(
    iso_9001_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE iso_9001_certificate_url IS NOT NULL 
  AND iso_9001_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update ISO 14001 Certificate URLs
UPDATE companies
SET iso_14001_certificate_url = 
  REPLACE(
    iso_14001_certificate_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE iso_14001_certificate_url IS NOT NULL 
  AND iso_14001_certificate_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Accident Reporting
UPDATE companies
SET accident_reporting_evidence_url = 
  REPLACE(
    accident_reporting_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE accident_reporting_evidence_url IS NOT NULL 
  AND accident_reporting_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET accident_investigation_evidence_url = 
  REPLACE(
    accident_investigation_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE accident_investigation_evidence_url IS NOT NULL 
  AND accident_investigation_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Health & Hazard
UPDATE companies
SET health_hazard_plan_evidence_url = 
  REPLACE(
    health_hazard_plan_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE health_hazard_plan_evidence_url IS NOT NULL 
  AND health_hazard_plan_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET exposure_monitoring_evidence_url = 
  REPLACE(
    exposure_monitoring_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE exposure_monitoring_evidence_url IS NOT NULL 
  AND exposure_monitoring_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET respiratory_training_evidence_url = 
  REPLACE(
    respiratory_training_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE respiratory_training_evidence_url IS NOT NULL 
  AND respiratory_training_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET exhaust_ventilation_evidence_url = 
  REPLACE(
    exhaust_ventilation_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE exhaust_ventilation_evidence_url IS NOT NULL 
  AND exhaust_ventilation_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET health_monitoring_evidence_url = 
  REPLACE(
    health_monitoring_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE health_monitoring_evidence_url IS NOT NULL 
  AND health_monitoring_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Induction
UPDATE companies
SET induction_programme_evidence_url = 
  REPLACE(
    induction_programme_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE induction_programme_evidence_url IS NOT NULL 
  AND induction_programme_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET induction_records_process_evidence_url = 
  REPLACE(
    induction_records_process_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE induction_records_process_evidence_url IS NOT NULL 
  AND induction_records_process_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET skills_training_list_evidence_url = 
  REPLACE(
    skills_training_list_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE skills_training_list_evidence_url IS NOT NULL 
  AND skills_training_list_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET competency_testing_system_evidence_url = 
  REPLACE(
    competency_testing_system_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE competency_testing_system_evidence_url IS NOT NULL 
  AND competency_testing_system_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Hazard Management
UPDATE companies
SET hazard_identification_process_evidence_url = 
  REPLACE(
    hazard_identification_process_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE hazard_identification_process_evidence_url IS NOT NULL 
  AND hazard_identification_process_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET jha_jsea_system_evidence_url = 
  REPLACE(
    jha_jsea_system_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE jha_jsea_system_evidence_url IS NOT NULL 
  AND jha_jsea_system_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET risk_registers_evidence_url = 
  REPLACE(
    risk_registers_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE risk_registers_evidence_url IS NOT NULL 
  AND risk_registers_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - PPE
UPDATE companies
SET ppe_training_maintenance_evidence_url = 
  REPLACE(
    ppe_training_maintenance_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE ppe_training_maintenance_evidence_url IS NOT NULL 
  AND ppe_training_maintenance_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET ppe_job_assessment_evidence_url = 
  REPLACE(
    ppe_job_assessment_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE ppe_job_assessment_evidence_url IS NOT NULL 
  AND ppe_job_assessment_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET ppe_maintenance_schedule_evidence_url = 
  REPLACE(
    ppe_maintenance_schedule_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE ppe_maintenance_schedule_evidence_url IS NOT NULL 
  AND ppe_maintenance_schedule_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Plant & Equipment
UPDATE companies
SET plant_equipment_licenses_evidence_url = 
  REPLACE(
    plant_equipment_licenses_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE plant_equipment_licenses_evidence_url IS NOT NULL 
  AND plant_equipment_licenses_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET plant_equipment_safety_provisions_evidence_url = 
  REPLACE(
    plant_equipment_safety_provisions_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE plant_equipment_safety_provisions_evidence_url IS NOT NULL 
  AND plant_equipment_safety_provisions_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET plant_equipment_maintenance_evidence_url = 
  REPLACE(
    plant_equipment_maintenance_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE plant_equipment_maintenance_evidence_url IS NOT NULL 
  AND plant_equipment_maintenance_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Electrical Equipment
UPDATE companies
SET electrical_equipment_testing_evidence_url = 
  REPLACE(
    electrical_equipment_testing_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE electrical_equipment_testing_evidence_url IS NOT NULL 
  AND electrical_equipment_testing_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET electrical_equipment_licenses_evidence_url = 
  REPLACE(
    electrical_equipment_licenses_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE electrical_equipment_licenses_evidence_url IS NOT NULL 
  AND electrical_equipment_licenses_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET electrical_equipment_safety_provisions_evidence_url = 
  REPLACE(
    electrical_equipment_safety_provisions_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE electrical_equipment_safety_provisions_evidence_url IS NOT NULL 
  AND electrical_equipment_safety_provisions_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET electrical_equipment_maintenance_evidence_url = 
  REPLACE(
    electrical_equipment_maintenance_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE electrical_equipment_maintenance_evidence_url IS NOT NULL 
  AND electrical_equipment_maintenance_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Emergency & Site
UPDATE companies
SET emergency_procedures_evidence_url = 
  REPLACE(
    emergency_procedures_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE emergency_procedures_evidence_url IS NOT NULL 
  AND emergency_procedures_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET site_safety_plans_evidence_url = 
  REPLACE(
    site_safety_plans_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE site_safety_plans_evidence_url IS NOT NULL 
  AND site_safety_plans_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET site_induction_process_evidence_url = 
  REPLACE(
    site_induction_process_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE site_induction_process_evidence_url IS NOT NULL 
  AND site_induction_process_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Contractor
UPDATE companies
SET contractor_induction_evidence_url = 
  REPLACE(
    contractor_induction_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE contractor_induction_evidence_url IS NOT NULL 
  AND contractor_induction_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET contractor_compliance_evidence_url = 
  REPLACE(
    contractor_compliance_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE contractor_compliance_evidence_url IS NOT NULL 
  AND contractor_compliance_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Health & Wellbeing
UPDATE companies
SET health_wellbeing_program_evidence_url = 
  REPLACE(
    health_wellbeing_program_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE health_wellbeing_program_evidence_url IS NOT NULL 
  AND health_wellbeing_program_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET fatigue_management_evidence_url = 
  REPLACE(
    fatigue_management_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE fatigue_management_evidence_url IS NOT NULL 
  AND fatigue_management_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Competency & Training
UPDATE companies
SET competency_framework_evidence_url = 
  REPLACE(
    competency_framework_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE competency_framework_evidence_url IS NOT NULL 
  AND competency_framework_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET training_records_evidence_url = 
  REPLACE(
    training_records_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE training_records_evidence_url IS NOT NULL 
  AND training_records_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET safety_communication_evidence_url = 
  REPLACE(
    safety_communication_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE safety_communication_evidence_url IS NOT NULL 
  AND safety_communication_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET near_miss_reporting_evidence_url = 
  REPLACE(
    near_miss_reporting_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE near_miss_reporting_evidence_url IS NOT NULL 
  AND near_miss_reporting_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Performance & Injury Management
UPDATE companies
SET performance_monitoring_evidence_url = 
  REPLACE(
    performance_monitoring_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE performance_monitoring_evidence_url IS NOT NULL 
  AND performance_monitoring_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET regular_audits_evidence_url = 
  REPLACE(
    regular_audits_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE regular_audits_evidence_url IS NOT NULL 
  AND regular_audits_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET injury_management_evidence_url = 
  REPLACE(
    injury_management_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE injury_management_evidence_url IS NOT NULL 
  AND injury_management_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET early_intervention_evidence_url = 
  REPLACE(
    early_intervention_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE early_intervention_evidence_url IS NOT NULL 
  AND early_intervention_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Update Evidence File URLs - Quality Management
UPDATE companies
SET quality_manager_and_plan_evidence_url = 
  REPLACE(
    quality_manager_and_plan_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE quality_manager_and_plan_evidence_url IS NOT NULL 
  AND quality_manager_and_plan_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET roles_and_responsibilities_evidence_url = 
  REPLACE(
    roles_and_responsibilities_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE roles_and_responsibilities_evidence_url IS NOT NULL 
  AND roles_and_responsibilities_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET purchasing_procedures_evidence_url = 
  REPLACE(
    purchasing_procedures_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE purchasing_procedures_evidence_url IS NOT NULL 
  AND purchasing_procedures_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET subcontractor_evaluation_evidence_url = 
  REPLACE(
    subcontractor_evaluation_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE subcontractor_evaluation_evidence_url IS NOT NULL 
  AND subcontractor_evaluation_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET process_control_plan_evidence_url = 
  REPLACE(
    process_control_plan_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE process_control_plan_evidence_url IS NOT NULL 
  AND process_control_plan_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET nonconformance_procedure_evidence_url = 
  REPLACE(
    nonconformance_procedure_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE nonconformance_procedure_evidence_url IS NOT NULL 
  AND nonconformance_procedure_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET product_rejection_evidence_url = 
  REPLACE(
    product_rejection_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE product_rejection_evidence_url IS NOT NULL 
  AND product_rejection_evidence_url LIKE '%/accreditations/' || id || '/%';

UPDATE companies
SET personnel_induction_evidence_url = 
  REPLACE(
    personnel_induction_evidence_url,
    '/accreditations/' || id || '/',
    '/accreditations/' || sanitize_company_name(name) || '/'
  )
WHERE personnel_induction_evidence_url IS NOT NULL 
  AND personnel_induction_evidence_url LIKE '%/accreditations/' || id || '/%';

-- Clean up the helper function after migration
DROP FUNCTION IF EXISTS sanitize_company_name(TEXT);

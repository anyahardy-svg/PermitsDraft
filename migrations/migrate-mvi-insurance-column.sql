-- Migration: Migrate Motor Vehicle Insurance URL to evidence_url column
-- Purpose: Copy data from legacy motor_vehicle_insurance_url to motor_vehicle_insurance_evidence_url
-- Reason: App reads motor_vehicle_insurance_evidence_url only; PLI was migrated but MVI was missed

-- ============================================================================
-- Migrate Motor Vehicle Insurance URL
-- ============================================================================

UPDATE companies
SET motor_vehicle_insurance_evidence_url = motor_vehicle_insurance_url
WHERE motor_vehicle_insurance_url IS NOT NULL
  AND motor_vehicle_insurance_evidence_url IS NULL;

-- Verify the migration worked
SELECT
  COUNT(*) AS companies_with_mvi_url,
  COUNT(CASE WHEN motor_vehicle_insurance_evidence_url IS NOT NULL THEN 1 END) AS migrated_count
FROM companies
WHERE motor_vehicle_insurance_url IS NOT NULL
   OR motor_vehicle_insurance_evidence_url IS NOT NULL;

-- Display sample of migrated data
SELECT
  id,
  name,
  motor_vehicle_insurance_url AS old_column,
  motor_vehicle_insurance_evidence_url AS new_column
FROM companies
WHERE motor_vehicle_insurance_evidence_url IS NOT NULL
LIMIT 10;

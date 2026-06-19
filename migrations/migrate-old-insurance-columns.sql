-- Migration: Migrate Old Insurance Columns to New Column Names
-- Purpose: Move data from old column names to new standardized column names
-- Reason: public_liability_insurance_url → public_liability_insurance_evidence_url
--         motor_vehicle_insurance_url → motor_vehicle_insurance_evidence_url

-- ============================================================================
-- Migrate Public Liability Insurance URL
-- ============================================================================

-- Copy data from old column to new column where new is empty but old has data
UPDATE companies
SET public_liability_insurance_evidence_url = public_liability_insurance_url
WHERE public_liability_insurance_url IS NOT NULL
  AND public_liability_insurance_evidence_url IS NULL;

-- ============================================================================
-- Migrate Motor Vehicle Insurance URL
-- ============================================================================

UPDATE companies
SET motor_vehicle_insurance_evidence_url = motor_vehicle_insurance_url
WHERE motor_vehicle_insurance_url IS NOT NULL
  AND motor_vehicle_insurance_evidence_url IS NULL;

-- Verify the migration worked
SELECT 
  COUNT(*) as companies_with_pli_evidence,
  COUNT(CASE WHEN public_liability_insurance_evidence_url IS NOT NULL THEN 1 END) as migrated_count
FROM companies;

-- Display sample of migrated data
SELECT 
  id,
  name,
  public_liability_insurance_url as old_column,
  public_liability_insurance_evidence_url as new_column
FROM companies
WHERE public_liability_insurance_evidence_url IS NOT NULL
LIMIT 10;

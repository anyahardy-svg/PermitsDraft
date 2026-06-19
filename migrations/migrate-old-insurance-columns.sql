-- Migration: Migrate Old Insurance Columns to New Column Names
-- Purpose: Move data from old column names to new standardized column names
-- Reason: public_liability_insurance_url → public_liability_insurance_evidence_url
-- Note: Only runs if legacy columns exist in this database.

-- ============================================================================
-- Migrate Public Liability Insurance URL (legacy column may not exist)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND column_name = 'public_liability_insurance_url'
  ) THEN
    UPDATE companies
    SET public_liability_insurance_evidence_url = public_liability_insurance_url
    WHERE public_liability_insurance_url IS NOT NULL
      AND public_liability_insurance_evidence_url IS NULL;
  END IF;
END $$;

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

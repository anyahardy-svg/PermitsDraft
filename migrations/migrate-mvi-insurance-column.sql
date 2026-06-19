-- Migration: Ensure motor vehicle insurance evidence column exists
-- Purpose: Create motor_vehicle_insurance_evidence_url if missing and show current data state
-- Note: This database does not use the legacy motor_vehicle_insurance_url column.
--       If files exist in storage but URLs are empty, run:
--       node scripts/backfill-section-evidence-urls.js

-- ============================================================================
-- Ensure required insurance columns exist
-- ============================================================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS motor_vehicle_insurance_evidence_url TEXT;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS public_liability_insurance_evidence_url TEXT;

-- ============================================================================
-- Diagnostic: show which companies have MVI data in the database
-- ============================================================================

SELECT
  id,
  name,
  motor_vehicle_insurance_expiry,
  motor_vehicle_insurance_evidence_url,
  CASE
    WHEN motor_vehicle_insurance_evidence_url IS NOT NULL THEN 'has_document'
    WHEN motor_vehicle_insurance_expiry IS NOT NULL THEN 'expiry_only'
    ELSE 'missing'
  END AS mvi_status
FROM companies
WHERE motor_vehicle_insurance_evidence_url IS NOT NULL
   OR motor_vehicle_insurance_expiry IS NOT NULL
ORDER BY name;

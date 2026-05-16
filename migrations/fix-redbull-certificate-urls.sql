-- Migration: Complete Fix for RedBull Powder Company Storage Issues
-- Purpose: Fix certificate URLs, link evidence files, add insurance columns, and populate all missing URLs
-- Issue: Files exist in storage but URLs are incomplete or not linked to database columns

-- ============================================================================
-- STEP 1: Add Insurance Document Columns (for all companies)
-- ============================================================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS motor_vehicle_insurance_evidence_url TEXT;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS public_liability_insurance_evidence_url TEXT;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS professional_indemnity_insurance_expiry TEXT;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS professional_indemnity_insurance_url TEXT;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS professional_indemnity_insurance_uploaded_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- STEP 2: Fix Certificate URLs with Correct Folder Structure
-- ============================================================================

-- Fix Totika Certificate URL (add folder structure)
UPDATE companies
SET totika_certificate_url = 
  REPLACE(
    totika_certificate_url,
    '/accreditations/redbull_powder_company/',
    '/accreditations/redbull_powder_company/totika_prequalified/'
  )
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND totika_certificate_url IS NOT NULL
  AND totika_certificate_url NOT LIKE '%/totika_prequalified/%';

-- Fix SiteWise Certificate URL (add folder structure)
UPDATE companies
SET sitewise_certificate_url = 
  REPLACE(
    sitewise_certificate_url,
    '/accreditations/redbull_powder_company/',
    '/accreditations/redbull_powder_company/sitewise_prequalified/'
  )
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND sitewise_certificate_url IS NOT NULL
  AND sitewise_certificate_url NOT LIKE '%/sitewise_prequalified/%';

-- ============================================================================
-- STEP 3: Link Evidence Files to Database Columns
-- ============================================================================

-- Link Quality Manager and Plan evidence (section 2.1)
UPDATE companies
SET quality_manager_and_plan_evidence_url = 
  'https://nszkuoxibzcbiqaqdfml.supabase.co/storage/v1/object/public/accreditations/redbull_powder_company/section21_quality_manager_and_plan_evidence/1778469120116.pdf'
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND quality_manager_and_plan_evidence_url IS NULL;

-- Link Purchasing Procedures evidence (section 2.1)
UPDATE companies
SET purchasing_procedures_evidence_url = 
  'https://nszkuoxibzcbiqaqdfml.supabase.co/storage/v1/object/public/accreditations/redbull_powder_company/section21_purchasing_procedures_evidence/1778469211783.pdf'
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND purchasing_procedures_evidence_url IS NULL;

-- Link Continuous Improvement evidence (section 2.1)
UPDATE companies
SET continuous_improvement_evidence_url = 
  'https://nszkuoxibzcbiqaqdfml.supabase.co/storage/v1/object/public/accreditations/redbull_powder_company/section21_continuous_improvement_evidence/1778469258546.pdf'
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND continuous_improvement_evidence_url IS NULL;

-- Link Environmental Assessment evidence (section 2.2)
UPDATE companies
SET environmental_aspects_assessment_evidence_url = 
  'https://nszkuoxibzcbiqaqdfml.supabase.co/storage/v1/object/public/accreditations/redbull_powder_company/section22_environmental_aspects_assessment_evidence/1778470583838.pdf'
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND environmental_aspects_assessment_evidence_url IS NULL;

-- ============================================================================
-- STEP 4: Link Insurance Documents
-- ============================================================================

-- Link Motor Vehicle Insurance document (using most recent upload)
UPDATE companies
SET motor_vehicle_insurance_evidence_url = 
  'https://nszkuoxibzcbiqaqdfml.supabase.co/storage/v1/object/public/accreditations/redbull_powder_company/insurance_mvi/1778472765836.pdf'
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND motor_vehicle_insurance_evidence_url IS NULL;

-- Link Public Liability Insurance document (using most recent upload)
UPDATE companies
SET public_liability_insurance_evidence_url = 
  'https://nszkuoxibzcbiqaqdfml.supabase.co/storage/v1/object/public/accreditations/redbull_powder_company/insurance_pli/1778472749594.pdf'
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'
  AND public_liability_insurance_evidence_url IS NULL;

-- ============================================================================
-- VERIFICATION: Display all updated URLs
-- ============================================================================

SELECT 
  'Totika Certificate' as item,
  totika_certificate_url as url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'

UNION ALL

SELECT 
  'SiteWise Certificate',
  sitewise_certificate_url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'

UNION ALL

SELECT 
  'Quality Manager Evidence',
  quality_manager_and_plan_evidence_url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'

UNION ALL

SELECT 
  'Purchasing Procedures Evidence',
  purchasing_procedures_evidence_url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'

UNION ALL

SELECT 
  'Continuous Improvement Evidence',
  continuous_improvement_evidence_url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'

UNION ALL

SELECT 
  'Environmental Assessment Evidence',
  environmental_aspects_assessment_evidence_url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'

UNION ALL

SELECT 
  'Motor Vehicle Insurance',
  motor_vehicle_insurance_evidence_url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821'

UNION ALL

SELECT 
  'Public Liability Insurance',
  public_liability_insurance_evidence_url
FROM companies
WHERE id = '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821';

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

-- Clean up the helper function after migration
DROP FUNCTION IF EXISTS sanitize_company_name(TEXT);

-- One-time backfill: link existing accreditations bucket files → companies.*_url columns
-- Use when uploads reached storage but DB URLs were never saved (RLS bug).
-- Contractors do NOT need to re-upload if their files are already in Storage.
--
-- Run in Supabase SQL Editor. Always run STEP 0 + PREVIEW before APPLY.

-- =============================================================================
-- STEP 0: Helpers (same folder naming as app / sanitize_company_name migration)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sanitize_company_storage_folder(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '_' from regexp_replace(
    regexp_replace(lower(trim(coalesce(name, ''))), '[^a-z0-9]+', '_', 'g'),
    '_+', '_', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.accreditation_cert_folder_to_column(cert_folder text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF cert_folder IS NULL OR cert_folder = '' THEN
    RETURN NULL;
  END IF;

  IF cert_folder = 'insurance_pli' THEN RETURN 'public_liability_insurance_evidence_url'; END IF;
  IF cert_folder = 'insurance_mvi' THEN RETURN 'motor_vehicle_insurance_evidence_url'; END IF;
  IF cert_folder = 'insurance_pii' THEN RETURN 'professional_indemnity_insurance_url'; END IF;

  IF cert_folder = 'policy_health_safety' THEN RETURN 'health_safety_policy_url'; END IF;
  IF cert_folder = 'policy_environmental' THEN RETURN 'environmental_policy_url'; END IF;
  IF cert_folder = 'policy_drug_alcohol' THEN RETURN 'drug_alcohol_policy_url'; END IF;
  IF cert_folder = 'policy_quality' THEN RETURN 'quality_policy_url'; END IF;

  IF cert_folder ~ '^section[0-9]+_.+_evidence$' THEN
    RETURN regexp_replace(cert_folder, '^section[0-9]+_(.+)_evidence$', '\1_evidence_url');
  END IF;

  IF cert_folder = 'aep_accredited' THEN RETURN 'aep_certificate_url'; END IF;
  IF cert_folder = 'iso_45001_certified' THEN RETURN 'iso_45001_certificate_url'; END IF;
  IF cert_folder = 'totika_prequalified' THEN RETURN 'totika_certificate_url'; END IF;
  IF cert_folder = 'she_prequal_qualified' THEN RETURN 'she_prequal_certificate_url'; END IF;
  IF cert_folder = 'impac_prequalified' THEN RETURN 'impac_certificate_url'; END IF;
  IF cert_folder = 'sitewise_prequalified' THEN RETURN 'sitewise_certificate_url'; END IF;
  IF cert_folder = 'rapid_prequalified' THEN RETURN 'rapid_certificate_url'; END IF;
  IF cert_folder = 'iso_9001_certified' THEN RETURN 'iso_9001_certificate_url'; END IF;
  IF cert_folder = 'iso_14001_certified' THEN RETURN 'iso_14001_certificate_url'; END IF;

  RETURN NULL;
END;
$$;

-- =============================================================================
-- PREVIEW: latest storage object per company + target column (only fills NULL URLs)
-- Optional: AND c.name ILIKE '%Dowdell%' to trial one company first
-- =============================================================================

WITH objects AS (
  SELECT
    o.name AS storage_path,
    split_part(o.name, '/', 1) AS seg1,
    split_part(o.name, '/', 2) AS cert_folder,
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'accreditations'
    AND o.name LIKE '%/%/%'
),
mapped AS (
  SELECT
    o.storage_path,
    o.cert_folder,
    public.accreditation_cert_folder_to_column(o.cert_folder) AS target_column,
    o.created_at,
    c.id AS company_id,
    c.name AS company_name
  FROM objects o
  JOIN public.companies c ON (
    c.id::text = o.seg1
    OR public.sanitize_company_storage_folder(c.name) = o.seg1
  )
  WHERE public.accreditation_cert_folder_to_column(o.cert_folder) IS NOT NULL
),
latest AS (
  SELECT DISTINCT ON (company_id, target_column)
    company_id,
    company_name,
    target_column,
    storage_path,
    cert_folder,
    created_at
  FROM mapped
  ORDER BY company_id, target_column, created_at DESC
)
SELECT
  l.company_name,
  l.target_column,
  l.cert_folder,
  l.storage_path,
  l.created_at
FROM latest l
ORDER BY l.company_name, l.target_column;

-- =============================================================================
-- VERIFY (one company): DB columns vs storage — run after PREVIEW or APPLY
-- Example: Dowdell & Associates Ltd (DAL)
-- =============================================================================

-- SELECT
--   id,
--   name,
--   totika_prequalified,
--   left(coalesce(totika_certificate_url, ''), 80) AS totika_url,
--   sitewise_prequalified,
--   left(coalesce(sitewise_certificate_url, ''), 80) AS sitewise_url,
--   iso_9001_certified,
--   left(coalesce(iso_9001_certificate_url, ''), 80) AS iso_9001_url,
--   left(coalesce(health_safety_policy_url, ''), 80) AS hs_policy_url,
--   left(coalesce(public_liability_insurance_evidence_url, ''), 80) AS pli_url
-- FROM public.companies
-- WHERE id = '67969028-617c-46d0-ae92-0c2db70448ef';

-- PREVIEW row count (e.g. ~866) only lists mappable storage files.
-- The admin UI shows "Click to upload" until *_certificate_url / *_policy_url columns are non-null.
-- That requires running the APPLY block below (it is commented out by default).

-- =============================================================================
-- APPLY: backfill NULL URL columns only (does not overwrite existing URLs)
-- Review PREVIEW output first. Run as one transaction.
-- Remove the surrounding comment markers before executing.
-- =============================================================================

/*
BEGIN;

CREATE TEMP TABLE accreditation_backfill_latest ON COMMIT DROP AS
WITH objects AS (
  SELECT
    o.name AS storage_path,
    split_part(o.name, '/', 1) AS seg1,
    split_part(o.name, '/', 2) AS cert_folder,
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'accreditations'
    AND o.name LIKE '%/%/%'
),
mapped AS (
  SELECT
    o.storage_path,
    public.accreditation_cert_folder_to_column(o.cert_folder) AS target_column,
    o.created_at,
    c.id AS company_id
  FROM objects o
  JOIN public.companies c ON (
    c.id::text = o.seg1
    OR public.sanitize_company_storage_folder(c.name) = o.seg1
  )
  WHERE public.accreditation_cert_folder_to_column(o.cert_folder) IS NOT NULL
)
SELECT DISTINCT ON (company_id, target_column)
  company_id,
  target_column,
  storage_path
FROM mapped
ORDER BY company_id, target_column, created_at DESC;

UPDATE public.companies c SET totika_certificate_url = l.storage_path, totika_prequalified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'totika_certificate_url' AND c.totika_certificate_url IS NULL;

UPDATE public.companies c SET sitewise_certificate_url = l.storage_path, sitewise_prequalified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'sitewise_certificate_url' AND c.sitewise_certificate_url IS NULL;

UPDATE public.companies c SET iso_9001_certificate_url = l.storage_path, iso_9001_certified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'iso_9001_certificate_url' AND c.iso_9001_certificate_url IS NULL;

UPDATE public.companies c SET iso_14001_certificate_url = l.storage_path, iso_14001_certified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'iso_14001_certificate_url' AND c.iso_14001_certificate_url IS NULL;

UPDATE public.companies c SET iso_45001_certificate_url = l.storage_path, iso_45001_certified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'iso_45001_certificate_url' AND c.iso_45001_certificate_url IS NULL;

UPDATE public.companies c SET aep_certificate_url = l.storage_path, aep_accredited = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'aep_certificate_url' AND c.aep_certificate_url IS NULL;

UPDATE public.companies c SET she_prequal_certificate_url = l.storage_path, she_prequal_qualified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'she_prequal_certificate_url' AND c.she_prequal_certificate_url IS NULL;

UPDATE public.companies c SET impac_certificate_url = l.storage_path, impac_prequalified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'impac_certificate_url' AND c.impac_certificate_url IS NULL;

UPDATE public.companies c SET rapid_certificate_url = l.storage_path, rapid_prequalified = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'rapid_certificate_url' AND c.rapid_certificate_url IS NULL;

UPDATE public.companies c SET health_safety_policy_url = l.storage_path, health_safety_policy_exists = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'health_safety_policy_url' AND c.health_safety_policy_url IS NULL;

UPDATE public.companies c SET environmental_policy_url = l.storage_path, environmental_policy_exists = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'environmental_policy_url' AND c.environmental_policy_url IS NULL;

UPDATE public.companies c SET drug_alcohol_policy_url = l.storage_path, drug_alcohol_policy_exists = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'drug_alcohol_policy_url' AND c.drug_alcohol_policy_url IS NULL;

UPDATE public.companies c SET quality_policy_url = l.storage_path, quality_policy_exists = true
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'quality_policy_url' AND c.quality_policy_url IS NULL;

UPDATE public.companies c SET public_liability_insurance_evidence_url = l.storage_path
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'public_liability_insurance_evidence_url' AND c.public_liability_insurance_evidence_url IS NULL;

UPDATE public.companies c SET motor_vehicle_insurance_evidence_url = l.storage_path
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'motor_vehicle_insurance_evidence_url' AND c.motor_vehicle_insurance_evidence_url IS NULL;

UPDATE public.companies c SET professional_indemnity_insurance_url = l.storage_path
FROM accreditation_backfill_latest l
WHERE c.id = l.company_id AND l.target_column = 'professional_indemnity_insurance_url' AND c.professional_indemnity_insurance_url IS NULL;

-- Section evidence columns (accident_reporting_evidence_url, etc.) — add UPDATEs here if needed
-- after checking PREVIEW for section* cert_folder rows.

COMMIT;
*/

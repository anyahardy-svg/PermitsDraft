-- Find companies likely hit by "files in storage, nothing in the portal/admin UI"
-- Run in Supabase SQL Editor (service role / dashboard — not from the anon client).
--
-- WHEN this class of bug starts:
--   After migrations/lock-down-anon-companies.sql is applied on production.
--   Repo merge: 2026-09-26 (PR #239). Your live start date = when that SQL was run in Supabase.
--   Worst for: company accreditation contacts (admin_staff / invitation) with NO contractors row
--   matching their login email — they could upload to storage but not UPDATE companies via PostgREST.

-- =============================================================================
-- STEP 1: Who is in the "at risk" login bucket? (same as portal, no contractor row)
-- =============================================================================

-- 1A) Explicit invitation grants
SELECT
  c.id AS company_id,
  c.name AS company_name,
  caa.email,
  caa.granted_at,
  EXISTS (
    SELECT 1 FROM public.contractors ct
    WHERE ct.company_id = c.id
      AND lower(ct.email) = lower(caa.email)
  ) AS also_has_contractor_row
FROM public.company_admin_access caa
JOIN public.companies c ON c.id = caa.company_id
ORDER BY c.name, caa.email;

-- 1B) Company contact / company email logins without a matching contractors row
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.contact_email AS login_email,
  'contact_email' AS match_source
FROM public.companies c
WHERE c.contact_email IS NOT NULL
  AND trim(c.contact_email) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.contractors ct
    WHERE ct.company_id = c.id
      AND lower(ct.email) = lower(c.contact_email)
  )
UNION ALL
SELECT
  c.id,
  c.name,
  c.email,
  'company.email'
FROM public.companies c
WHERE c.email IS NOT NULL
  AND trim(c.email) <> ''
  AND lower(c.email) IS DISTINCT FROM lower(coalesce(c.contact_email, ''))
  AND NOT EXISTS (
    SELECT 1 FROM public.contractors ct
    WHERE ct.company_id = c.id
      AND lower(ct.email) = lower(c.email)
  )
ORDER BY company_name, login_email;

-- =============================================================================
-- STEP 2: Companies with "checked" accreditation flags but missing certificate URLs
--         (typical Dowdell symptom after failed persists)
-- =============================================================================

SELECT
  id,
  name,
  accreditation_status,
  accreditation_last_updated,
  totika_prequalified,
  totika_certificate_url IS NOT NULL AS has_totika_url,
  sitewise_prequalified,
  sitewise_certificate_url IS NOT NULL AS has_sitewise_url,
  iso_9001_certified,
  iso_9001_certificate_url IS NOT NULL AS has_iso9001_url,
  health_safety_policy_exists,
  health_safety_policy_url IS NOT NULL AS has_hs_policy_url,
  public_liability_expiry,
  public_liability_insurance_evidence_url IS NOT NULL AS has_pli_url
FROM public.companies
WHERE
  (totika_prequalified AND totika_certificate_url IS NULL)
  OR (sitewise_prequalified AND sitewise_certificate_url IS NULL)
  OR (iso_9001_certified AND iso_9001_certificate_url IS NULL)
  OR (health_safety_policy_exists AND health_safety_policy_url IS NULL)
  OR (public_liability_expiry IS NOT NULL AND public_liability_insurance_evidence_url IS NULL)
ORDER BY accreditation_last_updated DESC NULLS LAST, name;

-- =============================================================================
-- STEP 3: Storage vs DB (ALL companies that have accreditations bucket files)
-- NOTE: This is NOT the orphan list. It returns ~every company with storage activity.
--       Row count ~300+ is normal. Use STEP 3B for "storage but DB not linked".
-- =============================================================================

WITH storage_by_company AS (
  SELECT
    split_part(o.name, '/', 1) AS storage_folder,
    count(*) AS object_count,
    min(o.created_at) AS first_upload,
    max(o.created_at) AS last_upload
  FROM storage.objects o
  WHERE o.bucket_id = 'accreditations'
    AND o.name LIKE '%/%'
  GROUP BY 1
),
companies_norm AS (
  SELECT
    id,
    name,
    trim(both '_' from regexp_replace(
      regexp_replace(lower(trim(name)), '[^a-z0-9]+', '_', 'g'),
      '_+', '_', 'g'
    )) AS storage_folder,
    totika_certificate_url,
    sitewise_certificate_url,
    iso_9001_certificate_url,
    health_safety_policy_url,
    public_liability_insurance_evidence_url,
    jsonb_array_length(coalesce(attachments, '[]'::jsonb)) AS attachment_count
  FROM public.companies
)
SELECT
  c.id,
  c.name,
  s.object_count,
  s.first_upload,
  s.last_upload,
  (
    c.totika_certificate_url IS NULL
    AND c.sitewise_certificate_url IS NULL
    AND c.iso_9001_certificate_url IS NULL
    AND c.health_safety_policy_url IS NULL
    AND c.public_liability_insurance_evidence_url IS NULL
    AND c.attachment_count = 0
  ) AS no_document_urls_in_db
FROM storage_by_company s
JOIN companies_norm c ON c.storage_folder = s.storage_folder
WHERE s.object_count > 0
ORDER BY s.last_upload DESC;

-- =============================================================================
-- STEP 3B: ORPHANS ONLY — files in storage, zero accreditation URLs in DB
-- (Run this for "who needs re-upload or backfill" — expect far fewer than Step 3)
-- =============================================================================

WITH storage_by_company AS (
  SELECT
    split_part(o.name, '/', 1) AS storage_folder,
    count(*) AS object_count,
    max(o.created_at) AS last_upload
  FROM storage.objects o
  WHERE o.bucket_id = 'accreditations'
    AND o.name LIKE '%/%'
  GROUP BY 1
),
companies_norm AS (
  SELECT
    id,
    name,
    contact_email,
    accreditation_last_updated,
    trim(both '_' from regexp_replace(
      regexp_replace(lower(trim(name)), '[^a-z0-9]+', '_', 'g'),
      '_+', '_', 'g'
    )) AS storage_folder,
    totika_certificate_url,
    sitewise_certificate_url,
    iso_9001_certificate_url,
    iso_45001_certificate_url,
    health_safety_policy_url,
    public_liability_insurance_evidence_url,
    motor_vehicle_insurance_evidence_url,
    jsonb_array_length(coalesce(attachments, '[]'::jsonb)) AS attachment_count
  FROM public.companies
)
SELECT
  c.id,
  c.name,
  c.contact_email,
  c.accreditation_last_updated,
  s.object_count,
  s.last_upload
FROM storage_by_company s
JOIN companies_norm c ON c.storage_folder = s.storage_folder
WHERE s.object_count > 0
  AND c.totika_certificate_url IS NULL
  AND c.sitewise_certificate_url IS NULL
  AND c.iso_9001_certificate_url IS NULL
  AND c.iso_45001_certificate_url IS NULL
  AND c.health_safety_policy_url IS NULL
  AND c.public_liability_insurance_evidence_url IS NULL
  AND c.motor_vehicle_insurance_evidence_url IS NULL
  AND c.attachment_count = 0
ORDER BY s.last_upload DESC;

-- =============================================================================
-- STEP 3C: PARTIAL orphans — storage + accreditation activity but Step 2 gaps
-- (e.g. Dowdell: ISO URL saved but Totika/SiteWise/PLI missing — NOT in 3B)
-- =============================================================================

WITH storage_by_company AS (
  SELECT split_part(o.name, '/', 1) AS storage_folder, count(*) AS object_count
  FROM storage.objects o
  WHERE o.bucket_id = 'accreditations' AND o.name LIKE '%/%'
  GROUP BY 1
),
companies_norm AS (
  SELECT
    c.*,
    trim(both '_' from regexp_replace(
      regexp_replace(lower(trim(c.name)), '[^a-z0-9]+', '_', 'g'),
      '_+', '_', 'g'
    )) AS storage_folder
  FROM public.companies c
)
SELECT
  c.id,
  c.name,
  c.contact_email,
  s.object_count,
  c.totika_prequalified,
  c.totika_certificate_url IS NULL AS totika_url_missing,
  c.sitewise_prequalified,
  c.sitewise_certificate_url IS NULL AS sitewise_url_missing,
  c.health_safety_policy_exists,
  c.health_safety_policy_url IS NULL AS hs_policy_url_missing,
  c.public_liability_expiry,
  c.public_liability_insurance_evidence_url IS NULL AS pli_url_missing
FROM storage_by_company s
JOIN companies_norm c ON c.storage_folder = s.storage_folder
WHERE s.object_count > 0
  AND (
    (c.totika_prequalified AND c.totika_certificate_url IS NULL)
    OR (c.sitewise_prequalified AND c.sitewise_certificate_url IS NULL)
    OR (c.health_safety_policy_exists AND c.health_safety_policy_url IS NULL)
    OR (c.public_liability_expiry IS NOT NULL AND c.public_liability_insurance_evidence_url IS NULL)
  )
ORDER BY c.name;

-- =============================================================================
-- STEP 4: Narrow list — at-risk login AND (missing URLs OR storage without DB)
-- =============================================================================

-- Companies appearing in STEP 1B with any STEP 2 condition
SELECT DISTINCT c.id, c.name, c.contact_email, c.accreditation_last_updated
FROM public.companies c
WHERE c.contact_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contractors ct
    WHERE ct.company_id = c.id AND lower(ct.email) = lower(c.contact_email)
  )
  AND (
    (c.totika_prequalified AND c.totika_certificate_url IS NULL)
    OR (c.sitewise_prequalified AND c.sitewise_certificate_url IS NULL)
    OR (c.health_safety_policy_exists AND c.health_safety_policy_url IS NULL)
    OR (c.public_liability_expiry IS NOT NULL AND c.public_liability_insurance_evidence_url IS NULL)
  )
ORDER BY c.accreditation_last_updated DESC NULLS LAST;

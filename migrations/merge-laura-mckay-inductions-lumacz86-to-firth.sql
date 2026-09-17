-- Migration: Merge Laura McKay induction records into her Firth contractor row
-- Target: laura.mckay@firth.co.nz
--
-- Source resolution (first match wins):
--   1) contractor_id linked to auth.users lumacz86@gmail.com
--   2) contractors row with email lumacz86@gmail.com
--   3) another contractors row named Laura McKay (not the target row)
--
-- The legacy lumacz86 email often does NOT exist on contractors — only on auth.users.
-- Induction completions live in contractor_induction_progress against the linked contractor_id.
--
-- Run DISCOVER + PREVIEW first, then APPLY, then VERIFY.

-- =============================================================================
-- DISCOVER — run this first if APPLY fails
-- =============================================================================

SELECT
  'contractors_named_laura' AS section,
  c.id,
  c.name,
  c.email,
  c.company_id,
  c.induction_expiry,
  (
    SELECT count(*)
    FROM contractor_induction_progress cip
    WHERE cip.contractor_id = c.id
      AND cip.status = 'completed'
  ) AS completed_induction_count
FROM contractors c
WHERE c.name ILIKE '%laura%mckay%'
   OR lower(c.email) IN (
     'lumacz86@gmail.com',
     'laura.mckay@firth.co.nz',
     'menamano1022@gmail.com'
   )
ORDER BY c.email;

SELECT
  'auth_users' AS section,
  u.id AS auth_user_id,
  u.email AS auth_email,
  u.raw_user_meta_data->>'contractor_id' AS linked_contractor_id,
  c.name AS linked_contractor_name,
  c.email AS linked_contractor_email
FROM auth.users u
LEFT JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
WHERE lower(u.email) IN (
  'lumacz86@gmail.com',
  'laura.mckay@firth.co.nz',
  'menamano1022@gmail.com'
)
ORDER BY u.email;

SELECT
  'induction_progress_by_laura_rows' AS section,
  c.email,
  c.name,
  i.induction_name,
  cip.status,
  cip.completed_at
FROM contractors c
JOIN contractor_induction_progress cip ON cip.contractor_id = c.id
JOIN inductions i ON i.id = cip.induction_id
WHERE c.name ILIKE '%laura%mckay%'
   OR lower(c.email) IN (
     'lumacz86@gmail.com',
     'laura.mckay@firth.co.nz',
     'menamano1022@gmail.com'
   )
ORDER BY c.email, cip.completed_at DESC NULLS LAST;

-- =============================================================================
-- PREVIEW — resolved source/target pair
-- =============================================================================

WITH target_contractor AS (
  SELECT id, email, name
  FROM contractors
  WHERE lower(email) = 'laura.mckay@firth.co.nz'
  LIMIT 1
),
source_from_auth AS (
  SELECT (u.raw_user_meta_data->>'contractor_id')::uuid AS id
  FROM auth.users u
  WHERE lower(u.email) = 'lumacz86@gmail.com'
    AND u.raw_user_meta_data ? 'contractor_id'
    AND (u.raw_user_meta_data->>'contractor_id') ~* '^[0-9a-f-]{36}$'
  LIMIT 1
),
source_from_email AS (
  SELECT id
  FROM contractors
  WHERE lower(email) = 'lumacz86@gmail.com'
  LIMIT 1
),
source_from_name AS (
  SELECT c.id
  FROM contractors c
  CROSS JOIN target_contractor t
  WHERE c.name ILIKE '%laura%mckay%'
    AND c.id IS DISTINCT FROM t.id
    AND lower(c.email) IS DISTINCT FROM 'laura.mckay@firth.co.nz'
  ORDER BY (
    SELECT count(*)
    FROM contractor_induction_progress cip
    WHERE cip.contractor_id = c.id
      AND cip.status = 'completed'
  ) DESC,
  c.created_at ASC NULLS LAST
  LIMIT 1
),
resolved_source AS (
  SELECT COALESCE(
    (SELECT id FROM source_from_auth),
    (SELECT id FROM source_from_email),
    (SELECT id FROM source_from_name)
  ) AS id
),
merge_ctx AS (
  SELECT
    src.id AS source_id,
    tgt.id AS target_id,
    src.email AS source_email,
    tgt.email AS target_email,
    src.name AS source_name,
    tgt.name AS target_name
  FROM resolved_source rs
  JOIN contractors src ON src.id = rs.id
  JOIN target_contractor tgt ON TRUE
)
SELECT 'resolved_merge_pair' AS section, *
FROM merge_ctx;

WITH target_contractor AS (
  SELECT id FROM contractors WHERE lower(email) = 'laura.mckay@firth.co.nz' LIMIT 1
),
source_from_auth AS (
  SELECT (u.raw_user_meta_data->>'contractor_id')::uuid AS id
  FROM auth.users u
  WHERE lower(u.email) = 'lumacz86@gmail.com'
    AND u.raw_user_meta_data ? 'contractor_id'
    AND (u.raw_user_meta_data->>'contractor_id') ~* '^[0-9a-f-]{36}$'
  LIMIT 1
),
source_from_email AS (
  SELECT id FROM contractors WHERE lower(email) = 'lumacz86@gmail.com' LIMIT 1
),
source_from_name AS (
  SELECT c.id
  FROM contractors c
  CROSS JOIN target_contractor t
  WHERE c.name ILIKE '%laura%mckay%'
    AND c.id IS DISTINCT FROM t.id
    AND lower(c.email) IS DISTINCT FROM 'laura.mckay@firth.co.nz'
  ORDER BY (
    SELECT count(*)
    FROM contractor_induction_progress cip
    WHERE cip.contractor_id = c.id
      AND cip.status = 'completed'
  ) DESC,
  c.created_at ASC NULLS LAST
  LIMIT 1
),
resolved_source AS (
  SELECT COALESCE(
    (SELECT id FROM source_from_auth),
    (SELECT id FROM source_from_email),
    (SELECT id FROM source_from_name)
  ) AS id
),
merge_ctx AS (
  SELECT rs.id AS source_id, tgt.id AS target_id
  FROM resolved_source rs
  JOIN contractors src ON src.id = rs.id
  CROSS JOIN target_contractor tgt
)
SELECT
  'source_progress' AS section,
  i.induction_name,
  cip.status,
  cip.completed_at
FROM contractor_induction_progress cip
JOIN merge_ctx mc ON cip.contractor_id = mc.source_id
JOIN inductions i ON i.id = cip.induction_id
ORDER BY cip.completed_at DESC NULLS LAST;

WITH target_contractor AS (
  SELECT id FROM contractors WHERE lower(email) = 'laura.mckay@firth.co.nz' LIMIT 1
),
source_from_auth AS (
  SELECT (u.raw_user_meta_data->>'contractor_id')::uuid AS id
  FROM auth.users u
  WHERE lower(u.email) = 'lumacz86@gmail.com'
    AND u.raw_user_meta_data ? 'contractor_id'
    AND (u.raw_user_meta_data->>'contractor_id') ~* '^[0-9a-f-]{36}$'
  LIMIT 1
),
source_from_email AS (
  SELECT id FROM contractors WHERE lower(email) = 'lumacz86@gmail.com' LIMIT 1
),
source_from_name AS (
  SELECT c.id
  FROM contractors c
  CROSS JOIN target_contractor t
  WHERE c.name ILIKE '%laura%mckay%'
    AND c.id IS DISTINCT FROM t.id
    AND lower(c.email) IS DISTINCT FROM 'laura.mckay@firth.co.nz'
  ORDER BY (
    SELECT count(*)
    FROM contractor_induction_progress cip
    WHERE cip.contractor_id = c.id
      AND cip.status = 'completed'
  ) DESC,
  c.created_at ASC NULLS LAST
  LIMIT 1
),
resolved_source AS (
  SELECT COALESCE(
    (SELECT id FROM source_from_auth),
    (SELECT id FROM source_from_email),
    (SELECT id FROM source_from_name)
  ) AS id
),
merge_ctx AS (
  SELECT rs.id AS source_id, tgt.id AS target_id
  FROM resolved_source rs
  JOIN contractors src ON src.id = rs.id
  CROSS JOIN target_contractor tgt
)
SELECT
  'target_progress_before' AS section,
  i.induction_name,
  cip.status,
  cip.completed_at
FROM contractor_induction_progress cip
JOIN merge_ctx mc ON cip.contractor_id = mc.target_id
JOIN inductions i ON i.id = cip.induction_id
ORDER BY cip.completed_at DESC NULLS LAST;

-- =============================================================================
-- APPLY
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_source_id UUID;
  v_target_id UUID;
BEGIN
  SELECT id INTO v_target_id
  FROM contractors
  WHERE lower(email) = 'laura.mckay@firth.co.nz'
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Target contractor not found: laura.mckay@firth.co.nz';
  END IF;

  SELECT (u.raw_user_meta_data->>'contractor_id')::uuid INTO v_source_id
  FROM auth.users u
  WHERE lower(u.email) = 'lumacz86@gmail.com'
    AND u.raw_user_meta_data ? 'contractor_id'
    AND (u.raw_user_meta_data->>'contractor_id') ~* '^[0-9a-f-]{36}$'
  LIMIT 1;

  IF v_source_id IS NULL THEN
    SELECT id INTO v_source_id
    FROM contractors
    WHERE lower(email) = 'lumacz86@gmail.com'
    LIMIT 1;
  END IF;

  IF v_source_id IS NULL THEN
    SELECT c.id INTO v_source_id
    FROM contractors c
    WHERE c.name ILIKE '%laura%mckay%'
      AND c.id IS DISTINCT FROM v_target_id
      AND lower(c.email) IS DISTINCT FROM 'laura.mckay@firth.co.nz'
    ORDER BY (
      SELECT count(*)
      FROM contractor_induction_progress cip
      WHERE cip.contractor_id = c.id
        AND cip.status = 'completed'
    ) DESC,
    c.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION
      'Source contractor not found. Run DISCOVER queries — lumacz86@gmail.com is usually only on auth.users, not contractors.';
  END IF;

  IF v_source_id = v_target_id THEN
    RAISE EXCEPTION 'Source and target contractor are the same row (%)', v_source_id;
  END IF;

  CREATE TEMP TABLE laura_merge_ctx (
    source_id UUID NOT NULL,
    target_id UUID NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO laura_merge_ctx (source_id, target_id)
  VALUES (v_source_id, v_target_id);
END $$;

-- 1) Merge overlapping induction progress (same induction on both rows)
UPDATE contractor_induction_progress AS target_row
SET
  status = CASE
    WHEN source_row.status = 'completed'
      AND (
        target_row.status IS DISTINCT FROM 'completed'
        OR COALESCE(source_row.completed_at, 'epoch'::timestamptz)
           > COALESCE(target_row.completed_at, 'epoch'::timestamptz)
      )
      THEN 'completed'
    ELSE target_row.status
  END,
  completed_at = CASE
    WHEN source_row.status = 'completed'
      AND (
        target_row.completed_at IS NULL
        OR source_row.completed_at > target_row.completed_at
      )
      THEN source_row.completed_at
    ELSE target_row.completed_at
  END,
  answers = CASE
    WHEN source_row.status = 'completed'
      AND (
        target_row.status IS DISTINCT FROM 'completed'
        OR COALESCE(source_row.completed_at, 'epoch'::timestamptz)
           > COALESCE(target_row.completed_at, 'epoch'::timestamptz)
      )
      THEN COALESCE(source_row.answers, target_row.answers, '{}'::jsonb)
    ELSE COALESCE(target_row.answers, source_row.answers, '{}'::jsonb)
  END,
  signature_text = COALESCE(
    NULLIF(target_row.signature_text, ''),
    NULLIF(source_row.signature_text, '')
  ),
  started_at = LEAST(
    COALESCE(target_row.started_at, source_row.started_at),
    COALESCE(source_row.started_at, target_row.started_at)
  ),
  updated_at = NOW()
FROM contractor_induction_progress AS source_row
JOIN laura_merge_ctx mc ON TRUE
WHERE target_row.contractor_id = mc.target_id
  AND source_row.contractor_id = mc.source_id
  AND target_row.induction_id = source_row.induction_id;

-- 2) Move remaining source-only induction progress rows to target
UPDATE contractor_induction_progress AS source_row
SET
  contractor_id = mc.target_id,
  updated_at = NOW()
FROM laura_merge_ctx mc
WHERE source_row.contractor_id = mc.source_id
  AND NOT EXISTS (
    SELECT 1
    FROM contractor_induction_progress existing
    WHERE existing.contractor_id = mc.target_id
      AND existing.induction_id = source_row.induction_id
  );

-- 3) Remove leftover duplicate source progress rows
DELETE FROM contractor_induction_progress AS source_row
USING laura_merge_ctx mc
WHERE source_row.contractor_id = mc.source_id;

-- 4) Merge overlapping per-site induction records
UPDATE contractor_inductions AS target_row
SET
  inducted_at = CASE
    WHEN COALESCE(source_row.expires_at, 'epoch'::timestamptz)
         > COALESCE(target_row.expires_at, 'epoch'::timestamptz)
      THEN source_row.inducted_at
    ELSE target_row.inducted_at
  END,
  expires_at = GREATEST(target_row.expires_at, source_row.expires_at),
  status = CASE
    WHEN GREATEST(target_row.expires_at, source_row.expires_at) < NOW()
      THEN 'expired'
    ELSE 'completed'
  END,
  business_unit_id = COALESCE(target_row.business_unit_id, source_row.business_unit_id),
  acknowledgment_signature_url = COALESCE(
    target_row.acknowledgment_signature_url,
    source_row.acknowledgment_signature_url
  ),
  updated_at = NOW()
FROM contractor_inductions AS source_row
JOIN laura_merge_ctx mc ON TRUE
WHERE target_row.contractor_id = mc.target_id
  AND source_row.contractor_id = mc.source_id
  AND target_row.site_id = source_row.site_id;

-- 5) Move remaining source-only per-site induction rows to target
UPDATE contractor_inductions AS source_row
SET
  contractor_id = mc.target_id,
  updated_at = NOW()
FROM laura_merge_ctx mc
WHERE source_row.contractor_id = mc.source_id
  AND NOT EXISTS (
    SELECT 1
    FROM contractor_inductions existing
    WHERE existing.contractor_id = mc.target_id
      AND existing.site_id = source_row.site_id
  );

-- 6) Remove leftover duplicate source per-site rows
DELETE FROM contractor_inductions AS source_row
USING laura_merge_ctx mc
WHERE source_row.contractor_id = mc.source_id;

-- 7) Merge contractor profile fields used by kiosk / induction status
UPDATE contractors AS target_row
SET
  site_ids = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(target_row.site_ids, '{}'::uuid[])
      || COALESCE(source_row.site_ids, '{}'::uuid[])
    )
  ),
  business_unit_ids = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(target_row.business_unit_ids, '{}'::uuid[])
      || COALESCE(source_row.business_unit_ids, '{}'::uuid[])
    )
  ),
  service_ids = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(target_row.service_ids, '{}'::uuid[])
      || COALESCE(source_row.service_ids, '{}'::uuid[])
    )
  ),
  induction_expiry = GREATEST(target_row.induction_expiry, source_row.induction_expiry),
  phone = COALESCE(NULLIF(target_row.phone, ''), source_row.phone)
FROM contractors AS source_row
JOIN laura_merge_ctx mc ON TRUE
WHERE target_row.id = mc.target_id
  AND source_row.id = mc.source_id;

-- 8) Backfill any missing per-site records from completed site-specific progress
INSERT INTO contractor_inductions (
  contractor_id,
  site_id,
  business_unit_id,
  inducted_at,
  expires_at,
  status
)
SELECT
  mc.target_id,
  source.site_id,
  source.business_unit_id,
  source.inducted_at,
  source.expires_at,
  source.status
FROM laura_merge_ctx mc
CROSS JOIN LATERAL (
  SELECT
    i.site_id,
    s.business_unit_id,
    MAX(cip.completed_at) AS inducted_at,
    COALESCE(
      tgt.induction_expiry::timestamptz,
      MAX(cip.completed_at) + INTERVAL '1 year'
    ) AS expires_at,
    CASE
      WHEN COALESCE(
        tgt.induction_expiry::timestamptz,
        MAX(cip.completed_at) + INTERVAL '1 year'
      ) < NOW()
        THEN 'expired'
      ELSE 'completed'
    END AS status
  FROM contractor_induction_progress cip
  JOIN inductions i ON i.id = cip.induction_id
  JOIN contractors tgt ON tgt.id = mc.target_id
  JOIN sites s ON s.id = i.site_id
  WHERE cip.contractor_id = mc.target_id
    AND cip.status = 'completed'
    AND i.site_id IS NOT NULL
  GROUP BY i.site_id, s.business_unit_id, tgt.induction_expiry
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM contractor_inductions existing
  WHERE existing.contractor_id = mc.target_id
    AND existing.site_id = source.site_id
);

-- 9) Reassign kiosk sign-ins from legacy contractor row to current row
UPDATE sign_ins AS sign_in_row
SET
  contractor_id = mc.target_id,
  updated_at = NOW()
FROM laura_merge_ctx mc
WHERE sign_in_row.contractor_id = mc.source_id;

COMMIT;

-- =============================================================================
-- VERIFY
-- =============================================================================

SELECT
  c.email,
  c.name,
  c.induction_expiry,
  c.site_ids
FROM contractors c
WHERE c.name ILIKE '%laura%mckay%'
   OR lower(c.email) IN ('lumacz86@gmail.com', 'laura.mckay@firth.co.nz')
ORDER BY c.email;

SELECT
  c.email,
  i.induction_name,
  cip.status,
  cip.completed_at
FROM contractor_induction_progress cip
JOIN contractors c ON c.id = cip.contractor_id
JOIN inductions i ON i.id = cip.induction_id
WHERE lower(c.email) = 'laura.mckay@firth.co.nz'
ORDER BY cip.completed_at DESC NULLS LAST;

SELECT
  c.email,
  s.name AS site_name,
  ci.expires_at,
  ci.status
FROM contractor_inductions ci
JOIN contractors c ON c.id = ci.contractor_id
LEFT JOIN sites s ON s.id = ci.site_id
WHERE lower(c.email) = 'laura.mckay@firth.co.nz'
ORDER BY s.name;

-- Migration: Globalize services with applicable_business_unit_ids
-- Purpose: Replace per-BU duplicate service rows with one row per service name
-- Date: March 16, 2026
--
-- Supabase SQL editor: expect warnings about destructive ops and the temp
-- mapping table. Choose "Run without RLS" — service_canonical_map is TEMP
-- and is dropped automatically at COMMIT.

BEGIN;

-- ============================================================================
-- 1. ADD NEW COLUMN
-- ============================================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS applicable_business_unit_ids UUID[] DEFAULT '{}';

-- ============================================================================
-- 2. BUILD CANONICAL ID MAP (one canonical row per service name)
-- ============================================================================

CREATE TEMP TABLE service_canonical_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    s.id AS old_id,
    s.name,
    FIRST_VALUE(s.id) OVER (
      PARTITION BY s.name
      ORDER BY
        CASE WHEN bu.name = 'Winstone Aggregates' THEN 0 ELSE 1 END,
        s.created_at,
        s.id
    ) AS canonical_id
  FROM services s
  JOIN business_units bu ON bu.id = s.business_unit_id
)
SELECT DISTINCT old_id, canonical_id, name
FROM ranked;

-- ============================================================================
-- 3. MERGE APPLICABLE BUSINESS UNITS ONTO CANONICAL ROWS
-- ============================================================================

UPDATE services s
SET applicable_business_unit_ids = sub.bu_ids
FROM (
  SELECT
    m.canonical_id,
    ARRAY_AGG(DISTINCT s2.business_unit_id) AS bu_ids
  FROM service_canonical_map m
  JOIN services s2 ON s2.id = m.old_id
  GROUP BY m.canonical_id
) sub
WHERE s.id = sub.canonical_id;

-- ============================================================================
-- 4. REMAP FOREIGN REFERENCES TO CANONICAL IDS
-- ============================================================================

-- contractors.service_ids
UPDATE contractors c
SET service_ids = (
  SELECT COALESCE(ARRAY_AGG(DISTINCT m.canonical_id), '{}')
  FROM UNNEST(COALESCE(c.service_ids, '{}')) AS u(old_service_id)
  JOIN service_canonical_map m ON m.old_id = u.old_service_id
)
WHERE c.service_ids IS NOT NULL AND cardinality(c.service_ids) > 0;

-- permit_issuers.permitted_service_ids
UPDATE permit_issuers pi
SET permitted_service_ids = (
  SELECT COALESCE(ARRAY_AGG(DISTINCT m.canonical_id), '{}')
  FROM UNNEST(COALESCE(pi.permitted_service_ids, '{}')) AS u(old_service_id)
  JOIN service_canonical_map m ON m.old_id = u.old_service_id
)
WHERE pi.permitted_service_ids IS NOT NULL AND cardinality(pi.permitted_service_ids) > 0;

-- inductions.service_id
UPDATE inductions i
SET service_id = m.canonical_id
FROM service_canonical_map m
WHERE i.service_id = m.old_id
  AND i.service_id IS DISTINCT FROM m.canonical_id;

-- inductions.force_compulsory_with_service_id (legacy single column)
UPDATE inductions i
SET force_compulsory_with_service_id = m.canonical_id
FROM service_canonical_map m
WHERE i.force_compulsory_with_service_id = m.old_id
  AND i.force_compulsory_with_service_id IS DISTINCT FROM m.canonical_id;

-- inductions.force_compulsory_with_service_ids
UPDATE inductions i
SET force_compulsory_with_service_ids = (
  SELECT COALESCE(ARRAY_AGG(DISTINCT m.canonical_id), '{}')
  FROM UNNEST(COALESCE(i.force_compulsory_with_service_ids, '{}')) AS u(old_service_id)
  JOIN service_canonical_map m ON m.old_id = u.old_service_id
)
WHERE i.force_compulsory_with_service_ids IS NOT NULL
  AND cardinality(i.force_compulsory_with_service_ids) > 0;

-- companies.approved_services (JSONB array of UUID strings)
UPDATE companies c
SET approved_services = (
  SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(m.canonical_id::text)), '[]'::jsonb)
  FROM jsonb_array_elements_text(COALESCE(c.approved_services, '[]'::jsonb)) AS elem(value)
  JOIN service_canonical_map m ON m.old_id::text = elem.value
)
WHERE c.approved_services IS NOT NULL
  AND jsonb_array_length(COALESCE(c.approved_services, '[]'::jsonb)) > 0;

-- ============================================================================
-- 5. DELETE DUPLICATE SERVICE ROWS
-- ============================================================================

DELETE FROM services s
WHERE EXISTS (
  SELECT 1
  FROM service_canonical_map m
  WHERE m.old_id = s.id
    AND m.canonical_id <> s.id
);

-- ============================================================================
-- 6. DROP OLD BUSINESS UNIT COLUMN AND CONSTRAINTS
-- ============================================================================

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_business_unit_id_name_key;
DROP INDEX IF EXISTS idx_services_business_unit_id;

ALTER TABLE services DROP COLUMN IF EXISTS business_unit_id;

ALTER TABLE services
  ADD CONSTRAINT services_name_key UNIQUE (name);

CREATE INDEX IF NOT EXISTS idx_services_applicable_business_unit_ids
  ON services USING GIN (applicable_business_unit_ids);

COMMIT;

-- ============================================================================
-- Verification queries (comment out after deployment):
-- ============================================================================
-- SELECT COUNT(*) AS service_count FROM services;
-- SELECT name, applicable_business_unit_ids FROM services ORDER BY name;
-- SELECT id, name FROM services GROUP BY name HAVING COUNT(*) > 1;

-- Backfill companies.site_ids from contractor site assignments (one-time).
-- Purpose: Preserve the site lists previously shown on the Accredited Companies
-- report (which were derived from contractors) now that the app reads
-- companies.site_ids directly.
--
-- Safe to re-run: merges contractor-derived sites with any site_ids already
-- set on the company (e.g. via Manager Hub "Add Company to Site").
--
-- Prerequisite: migrations/add-site-ids-to-companies.sql

-- ---------------------------------------------------------------------------
-- 1. Ensure column exists
-- ---------------------------------------------------------------------------
ALTER TABLE companies ADD COLUMN IF NOT EXISTS site_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_companies_site_ids ON companies USING GIN(site_ids);

-- ---------------------------------------------------------------------------
-- 2. Roll up distinct site_ids per company from contractors
-- ---------------------------------------------------------------------------
WITH contractor_company_sites AS (
  SELECT
    ct.company_id,
    array_agg(DISTINCT sid ORDER BY sid) AS contractor_site_ids
  FROM contractors ct
  CROSS JOIN LATERAL unnest(COALESCE(ct.site_ids, '{}')) AS sid
  WHERE ct.company_id IS NOT NULL
  GROUP BY ct.company_id
),
merged AS (
  SELECT
    c.id AS company_id,
    COALESCE(
      (
        SELECT array_agg(DISTINCT x ORDER BY x)
        FROM (
          SELECT unnest(COALESCE(c.site_ids, '{}')) AS x
          UNION
          SELECT unnest(COALESCE(ccs.contractor_site_ids, '{}')) AS x
        ) combined
        WHERE x IS NOT NULL
      ),
      '{}'
    ) AS new_site_ids
  FROM companies c
  LEFT JOIN contractor_company_sites ccs ON ccs.company_id = c.id
  WHERE ccs.contractor_site_ids IS NOT NULL
     OR cardinality(COALESCE(c.site_ids, '{}')) > 0
)
UPDATE companies c
SET site_ids = m.new_site_ids
FROM merged m
WHERE c.id = m.company_id
  AND c.site_ids IS DISTINCT FROM m.new_site_ids;

-- ---------------------------------------------------------------------------
-- 3. Verification (sample)
-- ---------------------------------------------------------------------------
SELECT
  c.name,
  cardinality(COALESCE(c.site_ids, '{}')) AS site_count,
  (
    SELECT string_agg(s.name, '; ' ORDER BY s.name)
    FROM unnest(COALESCE(c.site_ids, '{}')) AS sid
    JOIN sites s ON s.id = sid
  ) AS site_names
FROM companies c
WHERE cardinality(COALESCE(c.site_ids, '{}')) > 0
ORDER BY c.name
LIMIT 20;

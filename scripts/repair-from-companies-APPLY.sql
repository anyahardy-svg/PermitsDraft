-- =============================================================================
-- APPLY REPAIR — run this file in Supabase SQL Editor (all 3 statements)
-- Preview first with repair-from-companies-table.sql STEP 1A
-- =============================================================================


-- STEP 1B: Fix contractor.company_id from companies table
WITH company_match_src AS (
  SELECT lower(trim(contact_email)) AS email, id AS company_id, 1 AS priority
  FROM companies
  WHERE contact_email IS NOT NULL AND trim(contact_email) <> '' AND contact_email LIKE '%@%'
  UNION ALL
  SELECT lower(trim(email)), id, 2
  FROM companies
  WHERE email IS NOT NULL AND trim(email) <> '' AND email LIKE '%@%'
),
company_match AS (
  SELECT email, company_id
  FROM (
    SELECT src.*, row_number() OVER (PARTITION BY email ORDER BY priority) AS rn
    FROM company_match_src src
  ) ranked
  WHERE rn = 1
),
resolved AS (
  SELECT
    u.email,
    COALESCE(
      cm.company_id,
      jr.company_id,
      CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
        THEN 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'::uuid END
    ) AS company_id
  FROM auth.users u
  LEFT JOIN company_match cm ON cm.email = lower(trim(u.email))
  LEFT JOIN LATERAL (
    SELECT company_id
    FROM contractor_join_requests
    WHERE lower(email) = lower(u.email) AND status = 'approved'
    ORDER BY reviewed_at DESC NULLS LAST
    LIMIT 1
  ) jr ON true
  WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
)
UPDATE contractors c
SET company_id = r.company_id, updated_at = NOW()
FROM resolved r
WHERE lower(c.email) = lower(r.email)
  AND r.company_id IS NOT NULL
  AND c.company_id IS DISTINCT FROM r.company_id;


-- STEP 2B: Create missing contractor rows
WITH company_match_src AS (
  SELECT lower(trim(contact_email)) AS email, id AS company_id, contact_name, contact_surname, 1 AS priority
  FROM companies
  WHERE contact_email IS NOT NULL AND trim(contact_email) <> '' AND contact_email LIKE '%@%'
  UNION ALL
  SELECT lower(trim(email)), id, contact_name, contact_surname, 2
  FROM companies
  WHERE email IS NOT NULL AND trim(email) <> '' AND email LIKE '%@%'
),
company_match AS (
  SELECT email, company_id, contact_name, contact_surname
  FROM (
    SELECT src.*, row_number() OVER (PARTITION BY email ORDER BY priority) AS rn
    FROM company_match_src src
  ) ranked
  WHERE rn = 1
)
INSERT INTO contractors (name, email, company_id)
SELECT
  COALESCE(
    NULLIF(trim(cm.contact_name || ' ' || COALESCE(cm.contact_surname, '')), ''),
    jr.name,
    initcap(replace(replace(split_part(u.email, '@', 1), '.', ' '), '_', ' '))
  ),
  u.email,
  COALESCE(
    cm.company_id,
    jr.company_id,
    CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
      THEN 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'::uuid END
  )
FROM auth.users u
LEFT JOIN company_match cm ON cm.email = lower(trim(u.email))
LEFT JOIN LATERAL (
  SELECT company_id, name
  FROM contractor_join_requests
  WHERE lower(email) = lower(u.email) AND status = 'approved'
  ORDER BY reviewed_at DESC NULLS LAST
  LIMIT 1
) jr ON true
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND NOT EXISTS (SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email))
  AND COALESCE(
    cm.company_id,
    jr.company_id,
    CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
      THEN 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'::uuid END
  ) IS NOT NULL;


-- STEP 3: Sync auth metadata from contractor rows
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', c.name,
    'contractor_name', c.name,
    'contractor_id', c.id::text,
    'company_id', c.company_id::text,
    'company_name', co.name,
    'user_type', 'contractor'
  )
FROM contractors c
LEFT JOIN companies co ON co.id = c.company_id
WHERE lower(c.email) = lower(u.email)
  AND COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND c.company_id IS NOT NULL
  AND (SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)) = 1;

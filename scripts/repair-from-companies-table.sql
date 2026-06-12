-- =============================================================================
-- REPAIR auth + contractors using companies table as source of truth
--
-- Matches auth.users.email to companies in this order:
--   1. companies.contact_email  (primary login contact — most auth users)
--   2. companies.email          (company account email, e.g. angela.g@nes.nz)
--   3. approved contractor_join_requests (when no companies match)
--   4. @winstoneaggregates.co.nz domain → Winstone Aggregates (internal staff)
--
-- Does NOT trust auth.users.raw_user_meta_data.company_id for assignment.
-- Run ONE SECTION AT A TIME in Supabase SQL Editor. Preview before apply.
-- =============================================================================

-- Winstone Aggregates UUID: faf93bef-1f88-4920-9b0d-bb72ccf8b7c7


-- -----------------------------------------------------------------------------
-- STEP 0: Preview coverage — how many auth users resolve from companies table
-- -----------------------------------------------------------------------------
WITH company_match_src AS (
  SELECT
    lower(trim(contact_email)) AS email,
    id AS company_id,
    name AS company_name,
    'contact_email' AS matched_field,
    1 AS priority
  FROM companies
  WHERE contact_email IS NOT NULL AND trim(contact_email) <> '' AND contact_email LIKE '%@%'

  UNION ALL

  SELECT lower(trim(email)), id, name, 'email', 2
  FROM companies
  WHERE email IS NOT NULL AND trim(email) <> '' AND email LIKE '%@%'
),
company_match AS (
  SELECT email, company_id, company_name, matched_field
  FROM (
    SELECT
      src.*,
      row_number() OVER (PARTITION BY email ORDER BY priority, company_name) AS rn
    FROM company_match_src src
  ) ranked
  WHERE rn = 1
),
resolved AS (
  SELECT
    u.id AS auth_user_id,
    u.email,
    u.raw_user_meta_data->>'name' AS auth_name,
    u.raw_user_meta_data->>'company_id' AS auth_company_id,
    co_auth.name AS auth_company_name,
    cm.company_id AS companies_company_id,
    cm.company_name AS companies_company_name,
    cm.matched_field,
    c.id AS contractor_id,
    c.company_id AS contractor_company_id,
    co_c.name AS contractor_company_name,
    CASE
      WHEN cm.company_id IS NOT NULL THEN 'companies_table'
      WHEN jr.company_id IS NOT NULL THEN 'join_request'
      WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz' THEN 'winstone_domain'
      ELSE 'unresolved'
    END AS resolution_source,
    COALESCE(
      cm.company_id,
      jr.company_id,
      CASE
        WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
        THEN 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'::uuid
      END
    ) AS target_company_id
  FROM auth.users u
  LEFT JOIN company_match cm ON cm.email = lower(trim(u.email))
  LEFT JOIN LATERAL (
    SELECT company_id
    FROM contractor_join_requests
    WHERE lower(email) = lower(u.email)
      AND status = 'approved'
    ORDER BY reviewed_at DESC NULLS LAST
    LIMIT 1
  ) jr ON true
  LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
  LEFT JOIN companies co_auth ON co_auth.id = (u.raw_user_meta_data->>'company_id')::uuid
  LEFT JOIN companies co_c ON co_c.id = c.company_id
  WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
)
SELECT
  resolution_source,
  count(*) AS users,
  count(*) FILTER (
    WHERE target_company_id IS NOT NULL
      AND (
        contractor_company_id IS DISTINCT FROM target_company_id
        OR auth_company_id IS DISTINCT FROM target_company_id::text
      )
  ) AS need_repair
FROM resolved
GROUP BY resolution_source
ORDER BY users DESC;


-- -----------------------------------------------------------------------------
-- STEP 1A: PREVIEW — users whose company should change (companies table wins)
-- -----------------------------------------------------------------------------
WITH company_match_src AS (
  SELECT
    lower(trim(contact_email)) AS email,
    id AS company_id,
    name AS company_name,
    contact_name,
    contact_surname,
    'contact_email' AS matched_field,
    1 AS priority
  FROM companies
  WHERE contact_email IS NOT NULL AND trim(contact_email) <> '' AND contact_email LIKE '%@%'
  UNION ALL
  SELECT lower(trim(email)), id, name, contact_name, contact_surname, 'email', 2
  FROM companies
  WHERE email IS NOT NULL AND trim(email) <> '' AND email LIKE '%@%'
),
company_match AS (
  SELECT email, company_id, company_name, matched_field, contact_name, contact_surname
  FROM (
    SELECT
      src.*,
      row_number() OVER (PARTITION BY email ORDER BY priority, company_name) AS rn
    FROM company_match_src src
  ) ranked
  WHERE rn = 1
),
target AS (
  SELECT
    u.email,
    u.raw_user_meta_data->>'name' AS current_auth_name,
    c.id AS contractor_id,
    c.name AS contractor_name,
    c.company_id AS current_contractor_company_id,
    co_now.name AS current_company_name,
    COALESCE(
      cm.company_id,
      jr.company_id,
      CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
        THEN 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'::uuid END
    ) AS target_company_id,
    COALESCE(
      cm.company_name,
      jr_co.name,
      CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
        THEN 'Winstone Aggregates' END
    ) AS target_company_name,
    COALESCE(
      cm.matched_field,
      CASE WHEN jr.company_id IS NOT NULL THEN 'join_request' END,
      CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz' THEN 'winstone_domain' END
    ) AS matched_via,
    COALESCE(
      NULLIF(trim(cm.contact_name || ' ' || COALESCE(cm.contact_surname, '')), ''),
      jr.name,
      initcap(replace(replace(split_part(u.email, '@', 1), '.', ' '), '_', ' '))
    ) AS suggested_name
  FROM auth.users u
  LEFT JOIN company_match cm ON cm.email = lower(trim(u.email))
  LEFT JOIN LATERAL (
    SELECT company_id, name
    FROM contractor_join_requests
    WHERE lower(email) = lower(u.email) AND status = 'approved'
    ORDER BY reviewed_at DESC NULLS LAST
    LIMIT 1
  ) jr ON true
  LEFT JOIN companies jr_co ON jr_co.id = jr.company_id
  LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
  LEFT JOIN companies co_now ON co_now.id = c.company_id
  WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
)
SELECT *
FROM target
WHERE target_company_id IS NOT NULL
  AND current_contractor_company_id IS DISTINCT FROM target_company_id
ORDER BY email;


-- -----------------------------------------------------------------------------
-- STEP 1B: APPLY — fix contractor.company_id from companies table (+ fallbacks)
-- Review STEP 1A first.
-- -----------------------------------------------------------------------------
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
    SELECT
      src.*,
      row_number() OVER (PARTITION BY email ORDER BY priority) AS rn
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
SET company_id = r.company_id,
    updated_at = NOW()
FROM resolved r
WHERE lower(c.email) = lower(r.email)
  AND r.company_id IS NOT NULL
  AND c.company_id IS DISTINCT FROM r.company_id;


-- -----------------------------------------------------------------------------
-- STEP 2A: PREVIEW — create missing contractor rows (companies-derived company)
-- -----------------------------------------------------------------------------
WITH company_match_src AS (
  SELECT
    lower(trim(contact_email)) AS email,
    id AS company_id,
    name AS company_name,
    contact_name,
    contact_surname,
    1 AS priority
  FROM companies
  WHERE contact_email IS NOT NULL AND trim(contact_email) <> '' AND contact_email LIKE '%@%'
  UNION ALL
  SELECT lower(trim(email)), id, name, contact_name, contact_surname, 2
  FROM companies
  WHERE email IS NOT NULL AND trim(email) <> '' AND email LIKE '%@%'
),
company_match AS (
  SELECT email, company_id, company_name, contact_name, contact_surname
  FROM (
    SELECT
      src.*,
      row_number() OVER (PARTITION BY email ORDER BY priority, company_name) AS rn
    FROM company_match_src src
  ) ranked
  WHERE rn = 1
)
SELECT
  u.email,
  COALESCE(
    NULLIF(trim(cm.contact_name || ' ' || COALESCE(cm.contact_surname, '')), ''),
    jr.name,
    initcap(replace(replace(split_part(u.email, '@', 1), '.', ' '), '_', ' '))
  ) AS will_create_name,
  COALESCE(
    cm.company_id,
    jr.company_id,
    CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
      THEN 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'::uuid END
  ) AS company_id,
  COALESCE(cm.company_name, jr_co.name, 'Winstone Aggregates') AS company_name
FROM auth.users u
LEFT JOIN company_match cm ON cm.email = lower(trim(u.email))
LEFT JOIN LATERAL (
  SELECT company_id, name
  FROM contractor_join_requests
  WHERE lower(email) = lower(u.email) AND status = 'approved'
  ORDER BY reviewed_at DESC NULLS LAST
  LIMIT 1
) jr ON true
LEFT JOIN companies jr_co ON jr_co.id = jr.company_id
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND NOT EXISTS (SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email))
  AND COALESCE(
    cm.company_id,
    jr.company_id,
    CASE WHEN lower(u.email) LIKE '%@winstoneaggregates.co.nz'
      THEN 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'::uuid END
  ) IS NOT NULL
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- STEP 2B: APPLY — create missing contractor rows
-- -----------------------------------------------------------------------------
WITH company_match_src AS (
  SELECT
    lower(trim(contact_email)) AS email,
    id AS company_id,
    contact_name,
    contact_surname,
    1 AS priority
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
    SELECT
      src.*,
      row_number() OVER (PARTITION BY email ORDER BY priority) AS rn
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


-- -----------------------------------------------------------------------------
-- STEP 3: Sync auth metadata from contractor row (single row per email only)
-- Run after steps 1B and 2B.
-- -----------------------------------------------------------------------------
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


-- -----------------------------------------------------------------------------
-- STEP 4: Key users — verify NZ Electrical, Conrad, Graze
-- Per companies export:
--   angie@nzelectricalsolutions.nz → contact_email → NZ Electrical (Angie Goodman)
--   angela.g@nes.nz              → email field    → NZ Electrical (same company)
--   graze.engineering@xtra.co.nz → Graze Engineering (Caleb — NOT Conrad)
--   conrad.klaasen@winstoneaggregates.co.nz → Winstone domain rule
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  co.name AS auth_company,
  c.name AS contractor_name,
  co_c.name AS contractor_company,
  CASE
    WHEN lower(u.email) = 'angie@nzelectricalsolutions.nz'
      AND co_c.id = '89ab75a6-7a99-42f6-91db-329af3577426' THEN 'OK'
    WHEN lower(u.email) = 'angela.g@nes.nz'
      AND co_c.id = '89ab75a6-7a99-42f6-91db-329af3577426' THEN 'OK'
    WHEN lower(u.email) = 'conrad.klaasen@winstoneaggregates.co.nz'
      AND co_c.id = 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7' THEN 'OK'
    WHEN lower(u.email) = 'graze.engineering@xtra.co.nz'
      AND co_c.id = 'df48cfb1-c490-4b02-bea3-2cc568186eb2' THEN 'OK'
    ELSE 'CHECK'
  END AS status
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN companies co_c ON co_c.id = c.company_id
WHERE lower(u.email) IN (
  'angie@nzelectricalsolutions.nz',
  'angela.g@nes.nz',
  'conrad.klaasen@winstoneaggregates.co.nz',
  'graze.engineering@xtra.co.nz'
)
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- STEP 5: Unresolved — auth users with no companies / join / winstone match
-- -----------------------------------------------------------------------------
WITH company_emails AS (
  SELECT lower(trim(contact_email)) AS email FROM companies
  WHERE contact_email IS NOT NULL AND trim(contact_email) <> '' AND contact_email LIKE '%@%'
  UNION
  SELECT lower(trim(email)) FROM companies
  WHERE email IS NOT NULL AND trim(email) <> '' AND email LIKE '%@%'
)
SELECT u.email, u.raw_user_meta_data->>'name' AS name, u.raw_user_meta_data->>'company_id' AS meta_company_id
FROM auth.users u
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND lower(trim(u.email)) NOT IN (SELECT email FROM company_emails)
  AND lower(u.email) NOT LIKE '%@winstoneaggregates.co.nz'
  AND NOT EXISTS (
    SELECT 1 FROM contractor_join_requests jr
    WHERE lower(jr.email) = lower(u.email) AND jr.status = 'approved'
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- STEP 6: VERIFY — wrong-person + broken links (should be 0 rows)
-- -----------------------------------------------------------------------------
SELECT
  u.email AS auth_email,
  u.raw_user_meta_data->>'name' AS meta_name,
  c.name AS linked_name,
  c.email AS linked_email,
  co.name AS company_name,
  'WRONG PERSON' AS issue
FROM auth.users u
JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
LEFT JOIN companies co ON co.id = c.company_id
WHERE lower(c.email) IS DISTINCT FROM lower(u.email)

UNION ALL

SELECT u.email, u.raw_user_meta_data->>'name', NULL, NULL, NULL, 'BROKEN contractor_id'
FROM auth.users u
WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  )

ORDER BY issue, auth_email;

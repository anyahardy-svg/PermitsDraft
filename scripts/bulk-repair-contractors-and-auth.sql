-- =============================================================================
-- BULK REPAIR: contractors table + auth.users metadata
-- DEPRECATED for company assignment — uses corrupted auth metadata company_id.
-- Prefer: scripts/repair-from-companies-table.sql (companies.contact_email / email).
-- Run in Supabase SQL Editor — ONE SECTION AT A TIME, preview before apply.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0: Preview how many will be affected
-- -----------------------------------------------------------------------------
SELECT 'needs_contractor_row' AS step, count(*) AS users
FROM auth.users u
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM companies co
    WHERE co.id = (u.raw_user_meta_data->>'company_id')::uuid
  )
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email)
  )

UNION ALL

SELECT 'can_sync_single_contractor_row', count(*)
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND c.company_id IS NOT NULL
  AND (
    SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)
  ) = 1

UNION ALL

SELECT 'broken_contractor_id', count(*)
FROM auth.users u
WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c
    WHERE c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  )

UNION ALL

SELECT 'multiple_contractor_rows_manual', count(DISTINCT lower(u.email))
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
WHERE (
  SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)
) > 1;


-- -----------------------------------------------------------------------------
-- STEP 1A: PREVIEW — contractor rows to create (~90 users)
-- -----------------------------------------------------------------------------
SELECT
  u.id AS auth_user_id,
  u.email,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'contractor_name'), ''),
    jr.name,
    initcap(replace(replace(split_part(u.email, '@', 1), '.', ' '), '_', ' '))
  ) AS will_create_name,
  (u.raw_user_meta_data->>'company_id')::uuid AS company_id,
  co.name AS company_name
FROM auth.users u
LEFT JOIN companies co ON co.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN LATERAL (
  SELECT name
  FROM contractor_join_requests
  WHERE lower(email) = lower(u.email)
  ORDER BY
    CASE WHEN status = 'approved' THEN 0 WHEN status = 'pending' THEN 1 ELSE 2 END,
    reviewed_at DESC NULLS LAST,
    requested_at DESC NULLS LAST
  LIMIT 1
) jr ON true
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND co.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email)
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- STEP 1B: APPLY — bulk create missing contractor rows
-- Review STEP 1A first. Safe to run if preview looks right.
-- -----------------------------------------------------------------------------
INSERT INTO contractors (name, email, company_id)
SELECT
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'contractor_name'), ''),
    jr.name,
    initcap(replace(replace(split_part(u.email, '@', 1), '.', ' '), '_', ' '))
  ) AS name,
  u.email,
  (u.raw_user_meta_data->>'company_id')::uuid AS company_id
FROM auth.users u
LEFT JOIN LATERAL (
  SELECT name
  FROM contractor_join_requests
  WHERE lower(email) = lower(u.email)
  ORDER BY
    CASE WHEN status = 'approved' THEN 0 WHEN status = 'pending' THEN 1 ELSE 2 END,
    reviewed_at DESC NULLS LAST,
    requested_at DESC NULLS LAST
  LIMIT 1
) jr ON true
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM companies co
    WHERE co.id = (u.raw_user_meta_data->>'company_id')::uuid
  )
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email)
  );


-- -----------------------------------------------------------------------------
-- STEP 2A: PREVIEW — sync auth metadata from single contractor row per email
-- -----------------------------------------------------------------------------
SELECT
  u.id AS auth_user_id,
  u.email,
  u.raw_user_meta_data->>'name' AS current_name,
  c.name AS new_name,
  u.raw_user_meta_data->>'contractor_id' AS current_contractor_id,
  c.id::text AS new_contractor_id,
  u.raw_user_meta_data->>'company_id' AS current_company_id,
  c.company_id::text AS new_company_id,
  co.name AS new_company_name
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = c.company_id
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND c.company_id IS NOT NULL
  AND (
    SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)
  ) = 1
  AND (
    u.raw_user_meta_data->>'contractor_id' IS DISTINCT FROM c.id::text
    OR u.raw_user_meta_data->>'name' IS DISTINCT FROM c.name
    OR u.raw_user_meta_data->>'company_id' IS DISTINCT FROM c.company_id::text
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- STEP 2B: APPLY — sync auth metadata (single contractor row per email)
-- Run AFTER step 1B. This wires contractor_id + name + company for most users.
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
  AND (
    SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)
  ) = 1;


-- -----------------------------------------------------------------------------
-- STEP 3: Fix broken contractor_id (points to missing row)
-- Re-links to own contractor row when exactly one exists.
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
  AND c.company_id IS NOT NULL
  AND (
    SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)
  ) = 1
  AND u.raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors dead
    WHERE dead.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  );


-- -----------------------------------------------------------------------------
-- STEP 4: MANUAL — multiple contractor rows for same email
-- Preview only — fix each email yourself after picking the right person.
-- -----------------------------------------------------------------------------
SELECT
  u.email AS auth_email,
  c.id AS contractor_id,
  c.name,
  c.company_id,
  co.name AS company_name
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = c.company_id
WHERE (
  SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)
) > 1
ORDER BY u.email, c.name;


-- broblasting@outlook.co.nz — pick Deshbeer Singh (adjust if wrong person):
/*
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', 'Deshbeer Singh',
    'contractor_name', 'Deshbeer Singh',
    'contractor_id', 'd5701c17-fe6c-4c7f-bcd0-f54fccff40e6',
    'company_id', '9f44261d-ca11-43da-80c8-366733befe59',
    'company_name', 'Bro Blasting Limited',
    'user_type', 'contractor'
  )
WHERE u.email = 'broblasting@outlook.co.nz';
*/


-- -----------------------------------------------------------------------------
-- STEP 5: Users skipped — no valid company_id on auth user
-- -----------------------------------------------------------------------------
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'company_id' AS meta_company_id,
  u.raw_user_meta_data->>'name' AS meta_name
FROM auth.users u
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email)
  )
  AND (
    u.raw_user_meta_data->>'company_id' IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM companies co
      WHERE co.id = (u.raw_user_meta_data->>'company_id')::uuid
    )
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- STEP 6: VERIFY — should return 0 rows for wrong-person check
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

SELECT
  u.email,
  u.raw_user_meta_data->>'name',
  NULL,
  NULL,
  NULL,
  'NO CONTRACTOR ROW'
FROM auth.users u
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM companies co
    WHERE co.id = (u.raw_user_meta_data->>'company_id')::uuid
  )
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email)
  )

UNION ALL

SELECT
  u.email,
  u.raw_user_meta_data->>'name',
  NULL,
  NULL,
  NULL,
  'BROKEN contractor_id'
FROM auth.users u
WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c
    WHERE c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  )

ORDER BY issue, auth_email;

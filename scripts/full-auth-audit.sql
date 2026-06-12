-- =============================================================================
-- FULL AUTH AUDIT — finds every problem type, not just wrong-person links
-- Run each query in Supabase SQL Editor. Fix in order: 1 → 2 → 3 → 4 → 5
-- =============================================================================

-- -----------------------------------------------------------------------------
-- QUERY 1: Wrong person linked (auth email ≠ contractor row email)
-- FIX: Clear metadata OR create contractor row + update auth
-- -----------------------------------------------------------------------------
SELECT
  '1_WRONG_PERSON' AS issue,
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' AS shows_name,
  c.name AS linked_person,
  c.email AS linked_email,
  u.raw_user_meta_data->>'contractor_id' AS wrong_contractor_id
FROM auth.users u
JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
WHERE lower(c.email) IS DISTINCT FROM lower(u.email)
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- QUERY 2: Broken contractor_id (points to missing contractor row)
-- -----------------------------------------------------------------------------
SELECT
  '2_BROKEN_LINK' AS issue,
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' AS meta_name,
  u.raw_user_meta_data->>'contractor_id' AS bad_contractor_id,
  u.raw_user_meta_data->>'company_id' AS meta_company_id
FROM auth.users u
WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c
    WHERE c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- QUERY 3: Same contractor_id on multiple auth users (shared identity)
-- -----------------------------------------------------------------------------
SELECT
  '3_SHARED_CONTRACTOR_ID' AS issue,
  u.raw_user_meta_data->>'contractor_id' AS shared_contractor_id,
  array_agg(u.email ORDER BY u.email) AS auth_emails,
  count(*) AS user_count
FROM auth.users u
WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
GROUP BY u.raw_user_meta_data->>'contractor_id'
HAVING count(*) > 1
ORDER BY count(*) DESC;


-- -----------------------------------------------------------------------------
-- QUERY 4: Auth user has no contractor row for their email
-- -----------------------------------------------------------------------------
SELECT
  '4_NO_CONTRACTOR_ROW' AS issue,
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' AS meta_name,
  u.raw_user_meta_data->>'contractor_id' AS meta_contractor_id,
  u.raw_user_meta_data->>'company_id' AS meta_company_id,
  jr.name AS join_request_name,
  jr.company_name AS join_company,
  jr.status AS join_status
FROM auth.users u
LEFT JOIN LATERAL (
  SELECT name, company_name, status
  FROM contractor_join_requests
  WHERE lower(email) = lower(u.email)
  ORDER BY reviewed_at DESC NULLS LAST
  LIMIT 1
) jr ON true
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email)
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- QUERY 5: Missing metadata but contractor row exists (safe auto-fix)
-- -----------------------------------------------------------------------------
WITH single_row AS (
  SELECT lower(email) AS email_key
  FROM contractors
  WHERE email IS NOT NULL AND company_id IS NOT NULL
  GROUP BY lower(email)
  HAVING count(*) = 1
)
SELECT
  '5_MISSING_METADATA_OK' AS issue,
  u.id,
  u.email,
  c.name AS should_be_name,
  c.id::text AS should_be_contractor_id,
  c.company_id::text AS should_be_company_id
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
JOIN single_row sr ON sr.email_key = lower(u.email)
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND (
    u.raw_user_meta_data->>'contractor_id' IS NULL
    OR u.raw_user_meta_data->>'name' IS NULL
    OR u.raw_user_meta_data->>'company_id' IS NULL
    OR u.raw_user_meta_data->>'contractor_id' IS DISTINCT FROM c.id::text
    OR u.raw_user_meta_data->>'company_id' IS DISTINCT FROM c.company_id::text
  )
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users u2
    JOIN contractors c2 ON c2.id = (u2.raw_user_meta_data->>'contractor_id')::uuid
    WHERE u2.id = u.id
      AND lower(c2.email) IS DISTINCT FROM lower(u2.email)
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- QUERY 6: Multiple contractor rows — manual pick required
-- -----------------------------------------------------------------------------
SELECT
  '6_MULTIPLE_ROWS' AS issue,
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


-- -----------------------------------------------------------------------------
-- QUERY 7: Contractor row exists but company_id is null
-- -----------------------------------------------------------------------------
SELECT
  '7_NULL_COMPANY' AS issue,
  u.email AS auth_email,
  c.id AS contractor_id,
  c.name,
  c.email
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
WHERE c.company_id IS NULL
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- QUERY 8: Summary counts
-- -----------------------------------------------------------------------------
SELECT issue, count(*) FROM (
  SELECT '1_WRONG_PERSON' AS issue FROM auth.users u
  JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  WHERE lower(c.email) IS DISTINCT FROM lower(u.email)

  UNION ALL
  SELECT '2_BROKEN_LINK' FROM auth.users u
  WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM contractors c WHERE c.id = (u.raw_user_meta_data->>'contractor_id')::uuid)

  UNION ALL
  SELECT '3_SHARED_CONTRACTOR_ID' FROM auth.users u
  WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
  GROUP BY u.raw_user_meta_data->>'contractor_id' HAVING count(*) > 1

  UNION ALL
  SELECT '4_NO_CONTRACTOR_ROW' FROM auth.users u
  WHERE COALESCE(u.raw_user_meta_data->>'user_type','contractor') = 'contractor'
    AND NOT EXISTS (SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email))

  UNION ALL
  SELECT '5_MISSING_METADATA_OK' FROM auth.users u
  JOIN contractors c ON lower(c.email) = lower(u.email)
  WHERE c.company_id IS NOT NULL
    AND (SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)) = 1
    AND (u.raw_user_meta_data->>'contractor_id' IS NULL OR u.raw_user_meta_data->>'contractor_id' IS DISTINCT FROM c.id::text)

  UNION ALL
  SELECT '6_MULTIPLE_ROWS' FROM auth.users u
  WHERE EXISTS (SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email))
    AND (SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)) > 1

  UNION ALL
  SELECT '7_NULL_COMPANY' FROM auth.users u
  JOIN contractors c ON lower(c.email) = lower(u.email)
  WHERE c.company_id IS NULL
) x
GROUP BY issue
ORDER BY issue;

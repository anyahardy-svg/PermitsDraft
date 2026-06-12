-- Repair auth.users contractor metadata (conservative)
-- Run in Supabase SQL Editor in this order:
--   1) audit_all
--   2) preview_safe_fixes
--   3) apply_safe_fixes
--   4) list_manual_review

-- =============================================================================
-- 1) AUDIT: categorise every auth user with a contractor email match
-- =============================================================================
WITH contractor_matches AS (
  SELECT
    u.id AS auth_user_id,
    u.email AS auth_email,
    u.raw_user_meta_data->>'name' AS meta_name,
    u.raw_user_meta_data->>'contractor_id' AS meta_contractor_id,
    u.raw_user_meta_data->>'company_id' AS meta_company_id,
    c.id AS contractor_id,
    c.name AS contractor_name,
    c.email AS contractor_email,
    c.company_id AS contractor_company_id,
    COUNT(*) OVER (PARTITION BY lower(u.email)) AS contractor_row_count
  FROM auth.users u
  JOIN contractors c ON lower(c.email) = lower(u.email)
  WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
),
linked AS (
  SELECT
    u.id AS auth_user_id,
    c.id AS linked_contractor_id,
    c.email AS linked_contractor_email,
    c.name AS linked_contractor_name
  FROM auth.users u
  LEFT JOIN contractors c
    ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
)
SELECT
  cm.auth_user_id,
  cm.auth_email,
  cm.meta_name,
  cm.contractor_name,
  cm.meta_contractor_id,
  cm.contractor_id AS matched_contractor_id,
  cm.meta_company_id,
  cm.contractor_company_id,
  cm.contractor_row_count,
  l.linked_contractor_email,
  l.linked_contractor_name,
  CASE
    WHEN cm.meta_contractor_id IS NULL THEN 'missing_metadata'
    WHEN l.linked_contractor_id IS NULL THEN 'broken_contractor_link'
    WHEN lower(l.linked_contractor_email) IS DISTINCT FROM lower(cm.auth_email) THEN 'wrong_person_linked'
    WHEN cm.meta_contractor_id::uuid = cm.contractor_id AND cm.contractor_row_count = 1 THEN 'ok_single_row'
    WHEN cm.meta_contractor_id::uuid = cm.contractor_id THEN 'ok_id_matches'
    WHEN cm.contractor_row_count > 1 THEN 'multiple_contractor_rows'
    ELSE 'metadata_out_of_sync'
  END AS status
FROM contractor_matches cm
LEFT JOIN linked l ON l.auth_user_id = cm.auth_user_id
ORDER BY status, cm.auth_email;


-- =============================================================================
-- 2) PREVIEW: only the rows we will auto-fix (safe cases)
-- =============================================================================
WITH matches AS (
  SELECT
    u.id AS auth_user_id,
    u.email AS auth_email,
    u.raw_user_meta_data->>'contractor_id' AS meta_contractor_id,
    u.raw_user_meta_data->>'company_id' AS meta_company_id,
    c.id AS contractor_id,
    c.name AS contractor_name,
    c.company_id AS contractor_company_id,
    co.name AS contractor_company_name,
    COUNT(*) OVER (PARTITION BY lower(u.email)) AS contractor_row_count
  FROM auth.users u
  JOIN contractors c ON lower(c.email) = lower(u.email)
  LEFT JOIN companies co ON co.id = c.company_id
  WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
),
linked AS (
  SELECT
    u.id AS auth_user_id,
    c.email AS linked_email
  FROM auth.users u
  LEFT JOIN contractors c
    ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
),
best_single AS (
  SELECT *
  FROM matches
  WHERE contractor_row_count = 1
),
best_multi AS (
  SELECT DISTINCT ON (m.auth_user_id)
    m.auth_user_id,
    m.auth_email,
    m.meta_contractor_id,
    m.meta_company_id,
    m.contractor_id,
    m.contractor_name,
    m.contractor_company_id,
    m.contractor_company_name
  FROM matches m
  WHERE m.contractor_row_count > 1
    AND m.meta_company_id IS NOT NULL
    AND m.contractor_company_id::text = m.meta_company_id
  ORDER BY m.auth_user_id, m.contractor_id
),
candidates AS (
  SELECT * FROM best_single
  UNION ALL
  SELECT * FROM best_multi
)
SELECT
  c.auth_user_id AS id,
  c.auth_email AS email,
  u.raw_user_meta_data->>'name' AS current_name,
  c.contractor_name AS new_name,
  c.meta_contractor_id AS current_contractor_id,
  c.contractor_id::text AS new_contractor_id,
  c.meta_company_id AS current_company_id,
  c.contractor_company_id::text AS new_company_id,
  CASE
    WHEN c.contractor_company_id IS NULL THEN 'SKIP — contractor has no company_id'
    WHEN l.linked_email IS NOT NULL
      AND lower(l.linked_email) = lower(c.auth_email)
      AND c.meta_contractor_id::uuid = c.contractor_id
      AND u.raw_user_meta_data->>'name' = c.contractor_name
    THEN 'SKIP — already correct'
    ELSE 'WILL FIX'
  END AS action
FROM candidates c
JOIN auth.users u ON u.id = c.auth_user_id
LEFT JOIN linked l ON l.auth_user_id = c.auth_user_id
ORDER BY action, c.auth_email;


-- =============================================================================
-- 3) APPLY: safe fixes only (single contractor row, OR multi-row with company match)
-- =============================================================================
WITH matches AS (
  SELECT
    u.id AS auth_user_id,
    u.email AS auth_email,
    u.raw_user_meta_data->>'contractor_id' AS meta_contractor_id,
    u.raw_user_meta_data->>'company_id' AS meta_company_id,
    c.id AS contractor_id,
    c.name AS contractor_name,
    c.company_id AS contractor_company_id,
    co.name AS contractor_company_name,
    COUNT(*) OVER (PARTITION BY lower(u.email)) AS contractor_row_count
  FROM auth.users u
  JOIN contractors c ON lower(c.email) = lower(u.email)
  LEFT JOIN companies co ON co.id = c.company_id
  WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
),
linked AS (
  SELECT
    u.id AS auth_user_id,
    c.email AS linked_email
  FROM auth.users u
  LEFT JOIN contractors c
    ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
),
best_single AS (
  SELECT * FROM matches WHERE contractor_row_count = 1
),
best_multi AS (
  SELECT DISTINCT ON (m.auth_user_id)
    m.*
  FROM matches m
  WHERE m.contractor_row_count > 1
    AND m.meta_company_id IS NOT NULL
    AND m.contractor_company_id::text = m.meta_company_id
  ORDER BY m.auth_user_id, m.contractor_id
),
to_fix AS (
  SELECT c.*
  FROM (
    SELECT * FROM best_single
    UNION ALL
    SELECT * FROM best_multi
  ) c
  JOIN auth.users u ON u.id = c.auth_user_id
  LEFT JOIN linked l ON l.auth_user_id = c.auth_user_id
  WHERE c.contractor_company_id IS NOT NULL
    AND NOT (
      l.linked_email IS NOT NULL
      AND lower(l.linked_email) = lower(c.auth_email)
      AND c.meta_contractor_id::uuid = c.contractor_id
      AND u.raw_user_meta_data->>'name' = c.contractor_name
    )
)
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'contractor_id', tf.contractor_id::text,
    'contractor_name', tf.contractor_name,
    'name', tf.contractor_name,
    'company_id', tf.contractor_company_id::text,
    'company_name', tf.contractor_company_name,
    'user_type', 'contractor'
  )
FROM to_fix tf
WHERE u.id = tf.auth_user_id;


-- =============================================================================
-- 4) MANUAL REVIEW: everyone the safe script deliberately skips
-- =============================================================================
WITH matches AS (
  SELECT
    u.id AS auth_user_id,
    u.email AS auth_email,
    u.raw_user_meta_data->>'company_id' AS meta_company_id,
    c.id AS contractor_id,
    c.name AS contractor_name,
    c.company_id AS contractor_company_id,
    co.name AS company_name,
    COUNT(*) OVER (PARTITION BY lower(u.email)) AS contractor_row_count
  FROM auth.users u
  JOIN contractors c ON lower(c.email) = lower(u.email)
  LEFT JOIN companies co ON co.id = c.company_id
  WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
)
SELECT
  auth_email,
  contractor_row_count,
  meta_company_id,
  contractor_id,
  contractor_name,
  contractor_company_id,
  company_name,
  CASE
    WHEN contractor_company_id IS NULL THEN 'Contractor row missing company_id'
    WHEN contractor_row_count > 1 AND (
      meta_company_id IS NULL
      OR contractor_company_id::text IS DISTINCT FROM meta_company_id
    ) THEN 'Multiple contractor rows — pick the correct company manually'
    ELSE 'Review'
  END AS reason
FROM matches
WHERE contractor_company_id IS NULL
   OR contractor_row_count > 1
ORDER BY auth_email, contractor_name;

-- =============================================================================
-- Audit: users incorrectly showing as Angie / NZ Electrical
-- Run in Supabase SQL Editor
-- =============================================================================

-- Angie's contractor row id(s) — run first to get current ids
SELECT id, name, email, company_id, created_at
FROM contractors
WHERE lower(email) = 'angie@nzelectricalsolutions.nz'
ORDER BY created_at;

-- NZ Electrical company id: 89ab75a6-7a99-42f6-91db-329af3577426

-- 1) Wrong person: auth contractor_id points at another user's contractor row
SELECT
  'WRONG_CONTRACTOR_ID' AS issue,
  u.email AS auth_email,
  u.raw_user_meta_data->>'name' AS auth_name,
  c.email AS linked_contractor_email,
  c.name AS linked_contractor_name,
  co.name AS linked_company
FROM auth.users u
JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
LEFT JOIN companies co ON co.id = c.company_id
WHERE lower(c.email) IS DISTINCT FROM lower(u.email)
ORDER BY u.email;

-- 2) Auth name shows Angie but email is someone else
SELECT
  'ANGIE_NAME_WRONG_EMAIL' AS issue,
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  u.raw_user_meta_data->>'company_name' AS auth_company_name,
  u.raw_user_meta_data->>'contractor_id' AS contractor_id
FROM auth.users u
WHERE (
  u.raw_user_meta_data->>'name' ILIKE '%angie%'
  OR u.raw_user_meta_data->>'contractor_name' ILIKE '%angie%'
)
AND lower(u.email) NOT IN (
  'angie@nzelectricalsolutions.nz',
  'angela.g@nes.nz'
)
ORDER BY u.email;

-- 3) NZ Electrical company_id on auth users who are not Angie/Angela G
SELECT
  'NZ_ELECTRICAL_WRONG_USER' AS issue,
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  c.name AS contractor_name,
  c.email AS contractor_email
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
WHERE u.raw_user_meta_data->>'company_id' = '89ab75a6-7a99-42f6-91db-329af3577426'
  AND lower(u.email) NOT IN (
    'angie@nzelectricalsolutions.nz',
    'angela.g@nes.nz'
  )
ORDER BY u.email;

-- 4) FIX preview — re-sync auth metadata from own contractor row (single row per email)
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS current_name,
  c.name AS should_be_name,
  u.raw_user_meta_data->>'company_id' AS current_company_id,
  c.company_id::text AS should_be_company_id,
  co.name AS should_be_company_name
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = c.company_id
WHERE c.company_id IS NOT NULL
  AND (
    SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)
  ) = 1
  AND (
    u.raw_user_meta_data->>'name' IS DISTINCT FROM c.name
    OR u.raw_user_meta_data->>'contractor_id' IS DISTINCT FROM c.id::text
    OR u.raw_user_meta_data->>'company_id' IS DISTINCT FROM c.company_id::text
  )
ORDER BY u.email;

-- 5) APPLY fix — run repair-from-companies-APPLY.sql Step 3 instead, or uncomment:
/*
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
  AND (SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)) = 1;
*/

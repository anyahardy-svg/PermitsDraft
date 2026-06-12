-- =============================================================================
-- EMERGENCY: Stop everyone showing as Angie / angie@nzelectricalsolutions.nz
-- Run in Supabase SQL Editor — preview each step before apply
-- =============================================================================

-- Angie's contractor row id(s) — confirm first
SELECT id, name, email, company_id, created_at
FROM contractors
WHERE lower(email) = 'angie@nzelectricalsolutions.nz'
ORDER BY created_at;

-- NZ Electrical company id: 89ab75a6-7a99-42f6-91db-329af3577426


-- -----------------------------------------------------------------------------
-- STEP 1: Who is affected? (auth points at Angie but email is someone else)
-- -----------------------------------------------------------------------------
SELECT
  u.email AS auth_email,
  u.raw_user_meta_data->>'name' AS auth_name,
  u.raw_user_meta_data->>'contractor_id' AS auth_contractor_id,
  c.email AS contractor_row_email,
  c.name AS contractor_row_name,
  co.name AS contractor_company
FROM auth.users u
LEFT JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
LEFT JOIN companies co ON co.id = c.company_id
WHERE u.raw_user_meta_data->>'contractor_id' IN (
  SELECT id::text FROM contractors
  WHERE lower(email) = 'angie@nzelectricalsolutions.nz'
)
AND lower(u.email) <> 'angie@nzelectricalsolutions.nz'
ORDER BY u.email;

-- Also: auth name is Angie but login email is not
SELECT email, raw_user_meta_data->>'name' AS name, raw_user_meta_data->>'contractor_id' AS contractor_id
FROM auth.users
WHERE (
  raw_user_meta_data->>'name' ILIKE 'angie%'
  OR raw_user_meta_data->>'contractor_name' ILIKE 'angie%'
)
AND lower(email) NOT IN ('angie@nzelectricalsolutions.nz', 'angela.g@nes.nz')
ORDER BY email;


-- -----------------------------------------------------------------------------
-- STEP 2: Check Polina, Nikita, Anna specifically
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  u.raw_user_meta_data->>'contractor_id' AS auth_contractor_id,
  u.raw_user_meta_data->>'company_id' AS auth_company_id,
  u.raw_user_meta_data->>'company_name' AS auth_company_name,
  c.id AS own_contractor_id,
  c.name AS own_contractor_name,
  c.email AS own_contractor_email,
  co.name AS own_company
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = c.company_id
WHERE lower(u.email) IN (
  'polina.maslova@janiking.co.nz',
  'nikita.anandh@atlascopco.com',
  'annab@globalsecurity.co.nz'
)
ORDER BY u.email;

-- Expected:
--   Polina  → Jani-King (NZ) Limited     677dac9b-f805-43a2-9702-72e77e0cb0cc
--   Nikita  → Atlas Copco                ecb3c8ec-59f6-4d80-910e-4fe1f28871a3
--   Anna    → Global Security            bbf1d097-5a7d-485a-92ae-98bfb21eac14


-- -----------------------------------------------------------------------------
-- STEP 3A: PREVIEW — re-sync ALL auth users from their own contractor row
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS was_name,
  c.name AS will_be_name,
  u.raw_user_meta_data->>'contractor_id' AS was_contractor_id,
  c.id::text AS will_be_contractor_id,
  co.name AS will_be_company
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = c.company_id
WHERE c.company_id IS NOT NULL
  AND (SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)) = 1
  AND (
    u.raw_user_meta_data->>'name' IS DISTINCT FROM c.name
    OR u.raw_user_meta_data->>'contractor_id' IS DISTINCT FROM c.id::text
    OR u.raw_user_meta_data->>'company_id' IS DISTINCT FROM c.company_id::text
  )
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- STEP 3B: APPLY — fix auth metadata for everyone with a single contractor row
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
  AND (SELECT count(*) FROM contractors c2 WHERE lower(c2.email) = lower(u.email)) = 1;


-- -----------------------------------------------------------------------------
-- STEP 4: Create missing contractor rows (Polina, Nikita, Anna if needed)
-- Uses companies.contact_email / email mapping
-- Run repair-from-companies-APPLY.sql Step 2B if any are still missing
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- STEP 5: VERIFY the three reporters
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  u.raw_user_meta_data->>'contractor_id' AS auth_contractor_id,
  co.name AS auth_company,
  c.name AS contractor_name,
  c.email AS contractor_email,
  co_c.name AS contractor_company,
  CASE
    WHEN lower(u.email) = 'polina.maslova@janiking.co.nz'
      AND co_c.id = '677dac9b-f805-43a2-9702-72e77e0cb0cc' THEN 'OK'
    WHEN lower(u.email) = 'nikita.anandh@atlascopco.com'
      AND co_c.id = 'ecb3c8ec-59f6-4d80-910e-4fe1f28871a3' THEN 'OK'
    WHEN lower(u.email) = 'annab@globalsecurity.co.nz'
      AND co_c.id = 'bbf1d097-5a7d-485a-92ae-98bfb21eac14' THEN 'OK'
    WHEN lower(u.email) IN (
      'polina.maslova@janiking.co.nz',
      'nikita.anandh@atlascopco.com',
      'annab@globalsecurity.co.nz'
    ) THEN 'STILL WRONG'
    ELSE 'n/a'
  END AS status
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN companies co_c ON co_c.id = c.company_id
WHERE lower(u.email) IN (
  'polina.maslova@janiking.co.nz',
  'nikita.anandh@atlascopco.com',
  'annab@globalsecurity.co.nz'
)
ORDER BY u.email;

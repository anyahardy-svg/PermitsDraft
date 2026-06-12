-- =============================================================================
-- FIX AUTH USERS — based on your 3 audit CSV exports
-- Run each section separately in Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0: Re-run audit — should return 0 rows when done
-- -----------------------------------------------------------------------------
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' AS meta_name,
  c.name AS linked_name,
  c.email AS linked_email,
  u.raw_user_meta_data->>'contractor_id' AS wrong_contractor_id
FROM auth.users u
JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
WHERE lower(c.email) IS DISTINCT FROM lower(u.email);


-- -----------------------------------------------------------------------------
-- STEP 1: URGENT — 5 users linked to someone else's contractor row
-- Uses each user's OWN contractor row (email must match).
-- Preview first:
-- -----------------------------------------------------------------------------
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' AS current_name,
  c.name AS fix_name,
  c.id::text AS fix_contractor_id,
  c.company_id::text AS fix_company_id
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
WHERE u.id IN (
  '9f79c1ca-7ae5-46fb-b9c9-2dc6dda76937', -- conrad.klaasen@winstoneaggregates.co.nz
  '0f1ba429-e061-4d8c-8789-f92efc56f6c3', -- akoffice@excel.co.nz
  'c058e78a-05b3-4d85-90fb-e2b69d61409b', -- mobiledieseltech70@yahoo.com
  '0ec986f3-5137-40b8-908d-b857a082b154', -- craig.pervan@maxtarr.co.nz
  '13a208ae-294c-4557-a36e-284f5beb96fe'  -- jansenelectricalnz@gmail.com
)
AND c.company_id IS NOT NULL
ORDER BY u.email;

-- If preview shows exactly 1 row per user, apply:
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', c.name,
    'contractor_name', c.name,
    'contractor_id', c.id::text,
    'company_id', c.company_id::text,
    'user_type', 'contractor'
  )
FROM contractors c
WHERE lower(c.email) = lower(u.email)
  AND c.company_id IS NOT NULL
  AND u.id IN (
    '9f79c1ca-7ae5-46fb-b9c9-2dc6dda76937',
    '0f1ba429-e061-4d8c-8789-f92efc56f6c3',
    'c058e78a-05b3-4d85-90fb-e2b69d61409b',
    '0ec986f3-5137-40b8-908d-b857a082b154',
    '13a208ae-294c-4557-a36e-284f5beb96fe'
  )
  AND (
    SELECT count(*)
    FROM contractors c2
    WHERE lower(c2.email) = lower(u.email)
  ) = 1;


-- -----------------------------------------------------------------------------
-- STEP 2: URGENT — Laura Mckay contractor_id shared by 2 auth users
-- menamano1022@gmail.com must NOT use lumacz86's contractor row
-- -----------------------------------------------------------------------------
SELECT id, email, name, company_id
FROM contractors
WHERE lower(email) IN ('lumacz86@gmail.com', 'menamano1022@gmail.com');

-- Fix lumacz86 (if contractor row exists):
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', c.name,
    'contractor_name', c.name,
    'contractor_id', c.id::text,
    'company_id', c.company_id::text,
    'user_type', 'contractor'
  )
FROM contractors c
WHERE u.id = 'af18cb4b-56fb-4927-85cd-965dedfd320d' -- lumacz86@gmail.com
  AND lower(c.email) = lower(u.email)
  AND c.company_id IS NOT NULL;

-- Fix menamano1022 separately (only if contractor row exists for that email):
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', c.name,
    'contractor_name', c.name,
    'contractor_id', c.id::text,
    'company_id', c.company_id::text,
    'user_type', 'contractor'
  )
FROM contractors c
WHERE u.id = 'cad1c51c-cf8b-444e-95b7-10d7d820ae90' -- menamano1022@gmail.com
  AND lower(c.email) = lower(u.email)
  AND c.company_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- STEP 3: Broken contractor_id (row missing or wrong UUID)
-- david@supremeltd.co.nz, pam.singh@firth.co.nz
-- -----------------------------------------------------------------------------
SELECT u.id, u.email, u.raw_user_meta_data->>'contractor_id' AS bad_id
FROM auth.users u
WHERE u.id IN (
  '60e35a6d-db77-4a04-9d06-3d89f4fd8edb', -- david@supremeltd.co.nz
  '892726d1-c24c-4aac-a0b8-a0e79ecb72e9'  -- pam.singh@firth.co.nz
);

SELECT id, name, email, company_id
FROM contractors
WHERE lower(email) IN ('david@supremeltd.co.nz', 'pam.singh@firth.co.nz');

-- Apply per user once you confirm contractor row above:
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', c.name,
    'contractor_name', c.name,
    'contractor_id', c.id::text,
    'company_id', c.company_id::text,
    'user_type', 'contractor'
  )
FROM contractors c
WHERE lower(c.email) = lower(u.email)
  AND c.company_id IS NOT NULL
  AND u.email = 'david@supremeltd.co.nz'; -- change email per user


-- -----------------------------------------------------------------------------
-- STEP 4: SAFE BULK — missing metadata, single contractor row, company unchanged
-- Excludes: company changes, simplex (null company), urgent fixes above
-- Preview:
-- -----------------------------------------------------------------------------
WITH single_contractor AS (
  SELECT lower(email) AS email_key
  FROM contractors
  WHERE email IS NOT NULL
  GROUP BY lower(email)
  HAVING count(*) = 1
)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' AS current_name,
  c.name AS new_name,
  c.id::text AS new_contractor_id,
  c.company_id::text AS new_company_id
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
JOIN single_contractor sc ON sc.email_key = lower(u.email)
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND c.company_id IS NOT NULL
  AND u.id NOT IN (
    '9f79c1ca-7ae5-46fb-b9c9-2dc6dda76937',
    '0f1ba429-e061-4d8c-8789-f92efc56f6c3',
    'c058e78a-05b3-4d85-90fb-e2b69d61409b',
    '0ec986f3-5137-40b8-908d-b857a082b154',
    '13a208ae-294c-4557-a36e-284f5beb96fe',
    'af18cb4b-56fb-4927-85cd-965dedfd320d',
    'cad1c51c-cf8b-444e-95b7-10d7d820ae90',
    '60e35a6d-db77-4a04-9d06-3d89f4fd8edb',
    '892726d1-c24c-4aac-a0b8-a0e79ecb72e9'
  )
  AND (
    u.raw_user_meta_data->>'contractor_id' IS NULL
    OR u.raw_user_meta_data->>'name' IS NULL
    OR u.raw_user_meta_data->>'company_id' IS NULL
    OR u.raw_user_meta_data->>'company_id' = c.company_id::text
  )
  AND u.email NOT IN (
    'adam@firstblock.co.nz',
    'anya.hardy@winstoneaggregates.co.nz',
    'kbcontractorsltd@xtra.co.nz',
    'simplex@xtra.co.nz'
  )
ORDER BY u.email;

-- Apply safe bulk:
WITH single_contractor AS (
  SELECT lower(email) AS email_key
  FROM contractors
  WHERE email IS NOT NULL
  GROUP BY lower(email)
  HAVING count(*) = 1
)
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', c.name,
    'contractor_name', c.name,
    'contractor_id', c.id::text,
    'company_id', c.company_id::text,
    'user_type', 'contractor'
  )
FROM contractors c
JOIN single_contractor sc ON sc.email_key = lower(c.email)
WHERE lower(c.email) = lower(u.email)
  AND COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND c.company_id IS NOT NULL
  AND u.id NOT IN (
    '9f79c1ca-7ae5-46fb-b9c9-2dc6dda76937',
    '0f1ba429-e061-4d8c-8789-f92efc56f6c3',
    'c058e78a-05b3-4d85-90fb-e2b69d61409b',
    '0ec986f3-5137-40b8-908d-b857a082b154',
    '13a208ae-294c-4557-a36e-284f5beb96fe',
    'af18cb4b-56fb-4927-85cd-965dedfd320d',
    'cad1c51c-cf8b-444e-95b7-10d7d820ae90',
    '60e35a6d-db77-4a04-9d06-3d89f4fd8edb',
    '892726d1-c24c-4aac-a0b8-a0e79ecb72e9'
  )
  AND (
    u.raw_user_meta_data->>'contractor_id' IS NULL
    OR u.raw_user_meta_data->>'name' IS NULL
    OR u.raw_user_meta_data->>'company_id' IS NULL
    OR u.raw_user_meta_data->>'company_id' = c.company_id::text
  )
  AND u.email NOT IN (
    'adam@firstblock.co.nz',
    'anya.hardy@winstoneaggregates.co.nz',
    'kbcontractorsltd@xtra.co.nz',
    'simplex@xtra.co.nz'
  );


-- -----------------------------------------------------------------------------
-- STEP 5: MANUAL — pick correct contractor row (multiple companies / null company)
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
WHERE u.email IN (
  'adam@firstblock.co.nz',
  'anya.hardy@winstoneaggregates.co.nz',
  'kbcontractorsltd@xtra.co.nz',
  'simplex@xtra.co.nz',
  'broblasting@outlook.co.nz'
)
ORDER BY u.email, co.name;

-- Then update one user at a time, e.g. jansenelectricalnz after step 1:
-- UPDATE auth.users SET raw_user_meta_data = ... WHERE id = '...';

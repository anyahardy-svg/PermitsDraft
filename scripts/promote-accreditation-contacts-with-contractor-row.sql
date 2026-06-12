-- Promote accreditation / company contacts who still have a contractors row.
-- The bulk promote script intentionally skips these (safe rule for field workers).
-- Use when STEP 3 verify shows admin_staff contacts still marked contractor.
--
-- Run STEP 0 first. Review contractor rows — only apply to company portal users,
-- not people who genuinely work on site.

-- STEP 0: Preview known accreditation contacts (adjust list as needed)
SELECT
  u.email,
  u.raw_user_meta_data->>'user_type' AS current_user_type,
  u.raw_user_meta_data->>'company_id' AS metadata_company_id,
  c.id AS company_id,
  c.name AS company_name,
  ct.id AS contractor_id,
  ct.name AS contractor_name,
  ct.company_id AS contractor_company_id,
  co_ct.name AS contractor_company_name,
  EXISTS (
    SELECT 1 FROM company_admin_access caa
    WHERE lower(caa.email) = lower(u.email) AND caa.company_id = c.id
  ) AS has_admin_access
FROM auth.users u
JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN contractors ct ON lower(ct.email) = lower(u.email)
LEFT JOIN companies co_ct ON co_ct.id = ct.company_id
WHERE lower(u.email) IN (
  'nikita.anandh@atlascopco.com',
  'polina.maslova@janiking.co.nz',
  'annab@globalsecurity.co.nz',
  'conrad.klaasen@winstoneaggregates.co.nz'
)
ORDER BY u.email;

-- STEP 0b: Broader preview — company contact_email / email match, still contractor
SELECT
  u.email,
  c.name AS company_name,
  ct.id AS contractor_id,
  ct.name AS contractor_name
FROM auth.users u
JOIN companies c ON (
  lower(c.contact_email) = lower(u.email)
  OR lower(c.email) = lower(u.email)
)
LEFT JOIN contractors ct ON lower(ct.email) = lower(u.email)
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') <> 'admin_staff'
ORDER BY c.name, u.email;

-- STEP 1A: Promote listed accreditation contacts to admin_staff
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'user_type', 'admin_staff',
    'company_id', c.id::text,
    'company_name', c.name
  )
FROM companies c
WHERE c.id = (u.raw_user_meta_data->>'company_id')::uuid
  AND lower(u.email) IN (
    'nikita.anandh@atlascopco.com',
    'polina.maslova@janiking.co.nz',
    'annab@globalsecurity.co.nz',
    'conrad.klaasen@winstoneaggregates.co.nz'
  );

-- STEP 1B: Grant company_admin_access for the same users
INSERT INTO company_admin_access (company_id, email, name, granted_at)
SELECT
  c.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email),
  COALESCE(u.last_sign_in_at, u.created_at, now())
FROM auth.users u
JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
WHERE lower(u.email) IN (
  'nikita.anandh@atlascopco.com',
  'polina.maslova@janiking.co.nz',
  'annab@globalsecurity.co.nz',
  'conrad.klaasen@winstoneaggregates.co.nz'
)
ON CONFLICT (company_id, email) DO NOTHING;

-- STEP 2: Verify (same as promote script STEP 3)
SELECT
  u.email,
  u.raw_user_meta_data->>'user_type' AS user_type,
  c.name AS company_name,
  EXISTS (SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email)) AS has_contractor_row,
  EXISTS (SELECT 1 FROM company_admin_access caa WHERE lower(caa.email) = lower(u.email)) AS has_admin_access
FROM auth.users u
LEFT JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
WHERE lower(u.email) IN (
  'nikita.anandh@atlascopco.com',
  'polina.maslova@janiking.co.nz',
  'annab@globalsecurity.co.nz',
  'angie@nzelectricalsolutions.nz',
  'conrad.klaasen@winstoneaggregates.co.nz'
)
ORDER BY u.email;

-- Optional STEP 3: Remove spurious contractor rows after admin_staff login works.
-- Only run if STEP 2 shows admin_staff + has_admin_access and you confirmed
-- these users do not need field-contractor / induction features.
/*
DELETE FROM contractors
WHERE lower(email) IN (
  'nikita.anandh@atlascopco.com',
  'polina.maslova@janiking.co.nz',
  'annab@globalsecurity.co.nz',
  'conrad.klaasen@winstoneaggregates.co.nz'
);
*/

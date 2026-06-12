-- Promote auth users to admin_staff when they have company access but NO contractors row.
-- Targets ~200 invitation/company-contact users still marked as contractor (see CSV audit).
--
-- SAFE RULE: If a contractors row exists for that email → keep as contractor (field worker).
--            If no contractors row → admin_staff (company portal / accreditation).
--
-- Prerequisites: migrations/add-company-admin-access.sql applied.
-- Run STEP 0 and STEP 1 first. Only run STEP 2A then STEP 2B after reviewing previews.

-- STEP 0: Preview — will become admin_staff (no contractor row)
SELECT
  u.email,
  COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') AS current_user_type,
  u.raw_user_meta_data->>'company_id' AS metadata_company_id,
  c.id AS company_id,
  c.name AS company_name
FROM auth.users u
JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
WHERE u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') <> 'admin_staff'
  AND NOT EXISTS (
    SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email)
  )
ORDER BY c.name, u.email;

-- STEP 0b: Count summary
SELECT
  COUNT(*) FILTER (
    WHERE NOT EXISTS (SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email))
  ) AS will_promote_to_admin_staff,
  COUNT(*) FILTER (
    WHERE EXISTS (SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email))
  ) AS will_stay_contractor
FROM auth.users u
WHERE u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') <> 'admin_staff';

-- STEP 1: Preview — staying as contractor (has contractors row; do not change)
SELECT
  u.email,
  c.name AS company_name,
  ct.name AS contractor_name
FROM auth.users u
JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
JOIN contractors ct ON lower(ct.email) = lower(u.email)
WHERE u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') <> 'admin_staff'
ORDER BY c.name, u.email;

-- STEP 2A: Apply admin_staff metadata (no contractor row only)
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
  AND COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') <> 'admin_staff'
  AND NOT EXISTS (
    SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email)
  );

-- STEP 2B: Grant company_admin_access for the same users
INSERT INTO company_admin_access (company_id, email, name, granted_at)
SELECT
  c.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email),
  COALESCE(u.last_sign_in_at, u.created_at, now())
FROM auth.users u
JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
WHERE u.raw_user_meta_data->>'user_type' = 'admin_staff'
  AND NOT EXISTS (
    SELECT 1 FROM company_admin_access caa
    WHERE lower(caa.email) = lower(u.email) AND caa.company_id = c.id
  )
ON CONFLICT (company_id, email) DO NOTHING;

-- STEP 3: Verify key accreditation contacts
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

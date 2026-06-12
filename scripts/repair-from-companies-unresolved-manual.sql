-- =============================================================================
-- Manual fixes for users not matched via companies.contact_email / email
-- (STEP 5 unresolved list — typically staff who are not the company contact)
-- Run AFTER repair-from-companies-APPLY.sql
-- =============================================================================

-- Preview the 5 unresolved users and whether meta company_id is valid
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  (u.raw_user_meta_data->>'company_id')::uuid AS meta_company_id,
  co.name AS meta_company_name,
  c.id AS contractor_id,
  c.company_id AS contractor_company_id
FROM auth.users u
LEFT JOIN companies co ON co.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
WHERE lower(u.email) IN (
  'angela.bell@hiltons.co.nz',
  'hs@sollys.co.nz',
  'matt@mountcampbell.co.nz',
  'pankhudi_5@hotmail.com',
  'sales@nzbrush.co.nz'
)
ORDER BY u.email;

-- Ensure NZ Brush has contact_email set (sales@ should then auto-match in future)
/*
UPDATE companies
SET contact_email = 'sales@nzbrush.co.nz', updated_at = NOW()
WHERE id = 'ef993c15-d79c-47d5-9587-f1dc739d69b4'
  AND (contact_email IS NULL OR trim(contact_email) = '');
*/

-- Fix contractor rows using known company_id from metadata (when company exists)
/*
UPDATE contractors c
SET company_id = sub.company_id, updated_at = NOW()
FROM (
  VALUES
    ('angela.bell@hiltons.co.nz', '15f19f70-fe19-40c9-9f44-7f6c06084faf'::uuid),
    ('hs@sollys.co.nz', 'c16eea24-9ad5-4126-9213-49eeba2be77e'::uuid),
    ('matt@mountcampbell.co.nz', '0b0574b8-628d-4632-a22a-e5b87993ae70'::uuid),
    ('pankhudi_5@hotmail.com', 'f16687bf-a7cb-4804-9dc6-338cc2eb8151'::uuid),
    ('sales@nzbrush.co.nz', 'ef993c15-d79c-47d5-9587-f1dc739d69b4'::uuid)
) AS sub(email, company_id)
WHERE lower(c.email) = lower(sub.email)
  AND EXISTS (SELECT 1 FROM companies co WHERE co.id = sub.company_id);

-- Create contractor rows if missing
INSERT INTO contractors (name, email, company_id)
SELECT
  COALESCE(u.raw_user_meta_data->>'name', initcap(split_part(u.email, '@', 1))),
  u.email,
  (u.raw_user_meta_data->>'company_id')::uuid
FROM auth.users u
WHERE lower(u.email) IN (
  'angela.bell@hiltons.co.nz',
  'hs@sollys.co.nz',
  'matt@mountcampbell.co.nz',
  'pankhudi_5@hotmail.com',
  'sales@nzbrush.co.nz'
)
AND NOT EXISTS (SELECT 1 FROM contractors c WHERE lower(c.email) = lower(u.email))
AND u.raw_user_meta_data->>'company_id' IS NOT NULL
AND EXISTS (
  SELECT 1 FROM companies co
  WHERE co.id = (u.raw_user_meta_data->>'company_id')::uuid
);

-- Sync auth metadata for these five
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
JOIN companies co ON co.id = c.company_id
WHERE lower(c.email) = lower(u.email)
  AND lower(u.email) IN (
    'angela.bell@hiltons.co.nz',
    'hs@sollys.co.nz',
    'matt@mountcampbell.co.nz',
    'pankhudi_5@hotmail.com',
    'sales@nzbrush.co.nz'
  );
*/

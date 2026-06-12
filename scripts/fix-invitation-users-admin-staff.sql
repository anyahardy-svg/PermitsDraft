-- Accreditation invitation users are company contacts (admin_staff), not field contractors.
-- Run STEP 0 to preview, then STEP 1 to fix auth metadata for existing invitation users.

-- STEP 0: Preview auth users who match a company contact but are marked as contractor
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'user_type' AS current_user_type,
  u.raw_user_meta_data->>'company_id' AS metadata_company_id,
  c.id AS company_id,
  c.name AS company_name,
  EXISTS (
    SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email)
  ) AS has_contractor_row
FROM auth.users u
JOIN companies c ON (
  lower(c.contact_email) = lower(u.email)
  OR lower(c.email) = lower(u.email)
)
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') <> 'admin_staff'
ORDER BY c.name, u.email;

-- STEP 1: Set admin_staff for company contacts without a contractor row
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'user_type', 'admin_staff',
    'company_id', c.id::text,
    'company_name', c.name
  )
FROM companies c
WHERE (
  lower(c.contact_email) = lower(u.email)
  OR lower(c.email) = lower(u.email)
)
AND NOT EXISTS (
  SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email)
);

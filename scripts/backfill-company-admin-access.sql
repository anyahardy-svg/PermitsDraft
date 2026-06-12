-- Backfill company_admin_access for users already invited as company admins.
-- Run migration add-company-admin-access.sql first.

-- STEP 0: Preview rows to insert from auth.users with admin_staff + company_id
SELECT
  u.email,
  u.raw_user_meta_data->>'company_id' AS company_id,
  u.raw_user_meta_data->>'name' AS name,
  c.name AS company_name
FROM auth.users u
JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
WHERE u.raw_user_meta_data->>'user_type' = 'admin_staff'
  AND u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM company_admin_access caa
    WHERE lower(caa.email) = lower(u.email)
      AND caa.company_id = c.id
  )
ORDER BY c.name, u.email;

-- STEP 1: Insert missing access rows
INSERT INTO company_admin_access (company_id, email, name, granted_at)
SELECT
  c.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email),
  COALESCE(u.last_sign_in_at, u.created_at, now())
FROM auth.users u
JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
WHERE u.raw_user_meta_data->>'user_type' = 'admin_staff'
  AND u.raw_user_meta_data->>'company_id' IS NOT NULL
ON CONFLICT (company_id, email) DO NOTHING;

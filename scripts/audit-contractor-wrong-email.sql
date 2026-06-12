-- Find contractor rows whose email does not match their auth user or company contact.
-- These corrupt rows caused invite/password forms to show angie@nzelectricalsolutions.nz.

-- STEP 0: Contractor rows still storing Angie's email for non-NZ-Electrical companies
SELECT
  c.id,
  c.name,
  c.email,
  c.company_id,
  co.name AS company_name
FROM contractors c
LEFT JOIN companies co ON co.id = c.company_id
WHERE lower(c.email) = 'angie@nzelectricalsolutions.nz'
  AND co.id IS DISTINCT FROM '89ab75a6-7a99-42f6-91db-329af3577426'::uuid
ORDER BY co.name, c.name;

-- STEP 1: Auth users whose email differs from their linked contractor row email
SELECT
  u.id AS auth_user_id,
  u.email AS auth_email,
  u.raw_user_meta_data->>'contractor_id' AS metadata_contractor_id,
  c.email AS contractor_row_email,
  c.name AS contractor_name,
  co.name AS company_name
FROM auth.users u
LEFT JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
LEFT JOIN companies co ON co.id = c.company_id
WHERE c.email IS NOT NULL
  AND lower(u.email) <> lower(c.email)
ORDER BY u.email;

-- =============================================================================
-- Deprovision auth users whose company was deleted (orphaned metadata)
-- Example: hs@sollys.co.nz → company_id c16eea24... no longer exists
-- =============================================================================

-- STEP 1: Preview all auth users pointing at a missing company
SELECT
  u.id AS auth_user_id,
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  u.raw_user_meta_data->>'company_id' AS stale_company_id,
  u.raw_user_meta_data->>'company_name' AS stale_company_name,
  c.id AS contractor_id
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
WHERE COALESCE(u.raw_user_meta_data->>'user_type', 'contractor') = 'contractor'
  AND u.raw_user_meta_data->>'company_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM companies co
    WHERE co.id = (u.raw_user_meta_data->>'company_id')::uuid
  )
ORDER BY u.email;


-- STEP 2: Sollys — delete auth user (company removed, no contractor row)
-- Run in Supabase SQL Editor. Deleting from auth.users cascades per your FK setup.
/*
DELETE FROM auth.users
WHERE lower(email) = 'hs@sollys.co.nz';
*/

-- Optional: also remove any join requests for deleted company
/*
DELETE FROM contractor_join_requests
WHERE lower(email) = 'hs@sollys.co.nz'
   OR company_id = 'c16eea24-9ad5-4126-9213-49eeba2be77e'::uuid;
*/

-- Alternative: ban user instead of delete (they cannot log in but record remains)
/*
UPDATE auth.users
SET banned_until = '2099-12-31 23:59:59+00',
    raw_user_meta_data = raw_user_meta_data - 'company_id' - 'company_name' - 'contractor_id'
WHERE lower(email) = 'hs@sollys.co.nz';
*/

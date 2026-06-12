-- Confirm email for contractor auth users stuck as "Waiting for verification"
-- in the Supabase dashboard (email_confirmed_at IS NULL).
--
-- Root cause: some flows created users with email_confirm: false or set passwords
-- via client updateUser without admin email_confirm: true.
--
-- Run STEP 0 first. Run STEP 1 only after reviewing the preview.

-- STEP 0: Preview unverified contractor-related auth users
SELECT
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  raw_user_meta_data->>'user_type' AS user_type,
  raw_user_meta_data->>'company_id' AS company_id
FROM auth.users
WHERE email_confirmed_at IS NULL
  AND (
    raw_user_meta_data->>'user_type' = 'contractor'
    OR raw_user_meta_data ? 'contractor_id'
    OR raw_user_meta_data ? 'company_id'
  )
ORDER BY created_at;

-- STEP 1: Confirm users who have signed in at least once (safest bulk fix)
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, last_sign_in_at, now()),
  updated_at = now()
WHERE email_confirmed_at IS NULL
  AND last_sign_in_at IS NOT NULL
  AND (
    raw_user_meta_data->>'user_type' = 'contractor'
    OR raw_user_meta_data ? 'contractor_id'
    OR raw_user_meta_data ? 'company_id'
  );

-- STEP 2: Verify — should return 0 rows for users who have signed in
SELECT COUNT(*) AS still_unverified_signed_in_users
FROM auth.users
WHERE email_confirmed_at IS NULL
  AND last_sign_in_at IS NOT NULL
  AND (
    raw_user_meta_data->>'user_type' = 'contractor'
    OR raw_user_meta_data ? 'contractor_id'
    OR raw_user_meta_data ? 'company_id'
  );

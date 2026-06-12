-- Diagnose why an auth user can sign in but gets "Contractor record not found"
-- Replace the email below, run STEP 0 in Supabase SQL editor.

-- STEP 0: Set the email to diagnose
-- (Supabase SQL editor — replace in each query or use a DO block)

-- Auth user
SELECT
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  raw_user_meta_data->>'company_id' AS metadata_company_id,
  raw_user_meta_data->>'contractor_id' AS metadata_contractor_id,
  raw_user_meta_data->>'name' AS metadata_name
FROM auth.users
WHERE lower(email) = lower('anya.hardy@gmail.com');

-- Contractor rows with same email
SELECT id, name, email, company_id
FROM contractors
WHERE lower(email) = lower('anya.hardy@gmail.com');

-- Company match via contact_email / email (used for invite login without contractor row)
SELECT id, name, contact_email, email
FROM companies
WHERE lower(contact_email) = lower('anya.hardy@gmail.com')
   OR lower(email) = lower('anya.hardy@gmail.com');

-- Approved join requests
SELECT id, email, company_id, status, reviewed_at
FROM contractor_join_requests
WHERE lower(email) = lower('anya.hardy@gmail.com')
ORDER BY reviewed_at DESC NULLS LAST;

-- If auth exists under a different email (e.g. work vs gmail), find it:
SELECT id, name, email, company_id
FROM contractors
WHERE lower(name) LIKE '%anya%hardy%'
   OR lower(email) LIKE '%anya.hardy%';

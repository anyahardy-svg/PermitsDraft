-- =============================================================================
-- Fix wrong company assignments: Conrad, Angela G, Angie
-- Root cause: bulk repair used corrupted auth metadata company_id.
-- Run diagnostics first, then apply fixes with correct UUIDs from step 1.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Find the correct company UUIDs
-- -----------------------------------------------------------------------------
SELECT id, name, email
FROM companies
WHERE name ILIKE '%winstone%'
   OR name ILIKE '%graze%'
   OR name ILIKE '%nz electrical%'
   OR name ILIKE '%nes%'
   OR name ILIKE '%nzelectrical%'
ORDER BY name;

-- -----------------------------------------------------------------------------
-- STEP 2: See join requests (source of truth for who belongs where)
-- -----------------------------------------------------------------------------
SELECT email, name, company_id, company_name, status, reviewed_at
FROM contractor_join_requests
WHERE lower(email) IN (
  'conrad.klaasen@winstoneaggregates.co.nz',
  'angela.g@nes.nz',
  'angie@nzelectricalsolutions.nz'
)
ORDER BY email, reviewed_at DESC NULLS LAST;

-- -----------------------------------------------------------------------------
-- STEP 3: Current contractor + auth state for all three
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  u.raw_user_meta_data->>'company_id' AS auth_company_id,
  co_auth.name AS auth_company_name,
  c.id AS contractor_id,
  c.name AS contractor_name,
  c.company_id AS contractor_company_id,
  co_c.name AS contractor_company_name
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co_auth ON co_auth.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN companies co_c ON co_c.id = c.company_id
WHERE lower(u.email) IN (
  'conrad.klaasen@winstoneaggregates.co.nz',
  'angela.g@nes.nz',
  'angie@nzelectricalsolutions.nz'
)
ORDER BY u.email;

-- -----------------------------------------------------------------------------
-- STEP 4: Caleb Burgess / Graze (should NOT be Conrad)
-- -----------------------------------------------------------------------------
SELECT id, name, email, company_id
FROM contractors
WHERE lower(email) = 'graze.engineering@xtra.co.nz'
   OR name ILIKE '%caleb%burgess%';

-- =============================================================================
-- STEP 5: APPLY FIXES
-- Replace company UUIDs below after STEP 1 confirms the right ids.
-- Known from your data:
--   NZ Electrical Solutions Ltd = 89ab75a6-7a99-42f6-91db-329af3577426  (Angie)
--   Graze Engineering           = df48cfb1-c490-4b02-bea3-2cc568186eb2  (Caleb — NOT Conrad)
--   Winstone Aggregates         = faf93bef-1f88-4920-9b0d-bb72ccf8b7c7  (likely Conrad — confirm in STEP 1)
-- =============================================================================

-- CONRAD → Winstone Aggregates (NOT Graze)
/*
UPDATE contractors
SET company_id = 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7',
    updated_at = NOW()
WHERE lower(email) = 'conrad.klaasen@winstoneaggregates.co.nz';

UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', 'Conrad Klaasen',
    'contractor_name', 'Conrad Klaasen',
    'company_id', 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7',
    'company_name', 'Winstone Aggregates',
    'user_type', 'contractor'
  )
FROM contractors c
WHERE lower(u.email) = 'conrad.klaasen@winstoneaggregates.co.nz'
  AND lower(c.email) = lower(u.email)
  AND u.raw_user_meta_data =
      jsonb_set(
        COALESCE(u.raw_user_meta_data, '{}'::jsonb),
        '{contractor_id}',
        to_jsonb(c.id::text)
      ) IS NOT NULL;

-- Simpler Conrad auth fix if contractor row already exists:
UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', 'Conrad Klaasen',
    'contractor_name', 'Conrad Klaasen',
    'contractor_id', (SELECT id::text FROM contractors WHERE lower(email) = 'conrad.klaasen@winstoneaggregates.co.nz' LIMIT 1),
    'company_id', 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7',
    'company_name', 'Winstone Aggregates',
    'user_type', 'contractor'
  )
WHERE lower(email) = 'conrad.klaasen@winstoneaggregates.co.nz';
*/

-- ANGIE → stays NZ Electrical (confirm only)
/*
UPDATE contractors
SET company_id = '89ab75a6-7a99-42f6-91db-329af3577426',
    name = 'Angie',
    updated_at = NOW()
WHERE lower(email) = 'angie@nzelectricalsolutions.nz';

UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', 'Angie',
    'contractor_name', 'Angie',
    'contractor_id', (SELECT id::text FROM contractors WHERE lower(email) = 'angie@nzelectricalsolutions.nz' ORDER BY created_at DESC LIMIT 1),
    'company_id', '89ab75a6-7a99-42f6-91db-329af3577426',
    'company_name', 'NZ Electrical Solutions Ltd',
    'user_type', 'contractor'
  )
WHERE lower(email) = 'angie@nzelectricalsolutions.nz';
*/

-- ANGELA G → NOT NZ Electrical — set correct company from STEP 1 / join request
-- Replace PASTE-ANGELA-COMPANY-UUID and company name after you identify NES company
/*
UPDATE contractors
SET company_id = 'PASTE-ANGELA-COMPANY-UUID',
    updated_at = NOW()
WHERE lower(email) = 'angela.g@nes.nz';

UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', 'Angela G',
    'contractor_name', 'Angela G',
    'contractor_id', (SELECT id::text FROM contractors WHERE lower(email) = 'angela.g@nes.nz' LIMIT 1),
    'company_id', 'PASTE-ANGELA-COMPANY-UUID',
    'company_name', 'PASTE-ANGELA-COMPANY-NAME',
    'user_type', 'contractor'
  )
WHERE lower(email) = 'angela.g@nes.nz';
*/

-- -----------------------------------------------------------------------------
-- STEP 6: Remove duplicate Angie contractor rows (if bulk insert created extras)
-- -----------------------------------------------------------------------------
SELECT id, name, email, company_id, created_at
FROM contractors
WHERE lower(email) = 'angie@nzelectricalsolutions.nz'
ORDER BY created_at;

-- Keep the id referenced in auth.users; delete others only after confirming:
-- DELETE FROM contractors WHERE id = 'OLD-UUID-NOT-IN-AUTH';

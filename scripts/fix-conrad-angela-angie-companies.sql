-- =============================================================================
-- Targeted fixes: Conrad, Angie, Angela G
-- Use repair-from-companies-table.sql for bulk repair. This file is for
-- verification and manual overrides only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Companies table mapping (from companies export — authoritative)
-- -----------------------------------------------------------------------------
SELECT
  id,
  name,
  email AS company_email_field,
  contact_email,
  contact_name,
  contact_surname
FROM companies
WHERE id IN (
  '89ab75a6-7a99-42f6-91db-329af3577426',  -- NZ Electrical Solutions Ltd
  'df48cfb1-c490-4b02-bea3-2cc568186eb2',  -- Graze Engineering
  'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'   -- Winstone Aggregates
)
ORDER BY name;

-- Expected:
--   NZ Electrical: company email = angela.g@nes.nz, contact = angie@nzelectricalsolutions.nz
--   Both Angela G and Angie belong to NZ Electrical (different people, same company).
--   Graze: graze.engineering@xtra.co.nz (Caleb Burgess — NOT Conrad)
--   Winstone: no conrad email in companies row; @winstoneaggregates.co.nz → Winstone


-- -----------------------------------------------------------------------------
-- Current state
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  co_auth.name AS auth_company,
  c.id AS contractor_id,
  c.name AS contractor_name,
  co_c.name AS contractor_company
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co_auth ON co_auth.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN companies co_c ON co_c.id = c.company_id
WHERE lower(u.email) IN (
  'conrad.klaasen@winstoneaggregates.co.nz',
  'angela.g@nes.nz',
  'angie@nzelectricalsolutions.nz',
  'graze.engineering@xtra.co.nz'
)
ORDER BY u.email;


-- -----------------------------------------------------------------------------
-- Duplicate Angie contractor rows (if bulk repair created extras)
-- -----------------------------------------------------------------------------
SELECT id, name, email, company_id, created_at
FROM contractors
WHERE lower(email) = 'angie@nzelectricalsolutions.nz'
ORDER BY created_at;


-- -----------------------------------------------------------------------------
-- APPLY: run repair-from-companies-table.sql steps 1B → 3 instead of manual
-- updates below. Uncomment only if you need one-off overrides after bulk repair.
-- -----------------------------------------------------------------------------

-- Conrad → Winstone (not Graze)
/*
UPDATE contractors
SET company_id = 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7', updated_at = NOW()
WHERE lower(email) = 'conrad.klaasen@winstoneaggregates.co.nz';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'name', 'Conrad Klaasen',
  'contractor_name', 'Conrad Klaasen',
  'contractor_id', (SELECT id::text FROM contractors WHERE lower(email) = 'conrad.klaasen@winstoneaggregates.co.nz' LIMIT 1),
  'company_id', 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7',
  'company_name', 'Winstone Aggregates',
  'user_type', 'contractor'
)
WHERE lower(email) = 'conrad.klaasen@winstoneaggregates.co.nz';
*/

-- Angie → NZ Electrical (contact_email match)
/*
UPDATE contractors
SET company_id = '89ab75a6-7a99-42f6-91db-329af3577426',
    name = 'Angie Goodman',
    updated_at = NOW()
WHERE lower(email) = 'angie@nzelectricalsolutions.nz';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'name', 'Angie Goodman',
  'contractor_name', 'Angie Goodman',
  'contractor_id', (SELECT id::text FROM contractors WHERE lower(email) = 'angie@nzelectricalsolutions.nz' ORDER BY created_at DESC LIMIT 1),
  'company_id', '89ab75a6-7a99-42f6-91db-329af3577426',
  'company_name', 'NZ Electrical Solutions Ltd',
  'user_type', 'contractor'
)
WHERE lower(email) = 'angie@nzelectricalsolutions.nz';
*/

-- Angela G → NZ Electrical (companies.email match — same company as Angie)
/*
UPDATE contractors
SET company_id = '89ab75a6-7a99-42f6-91db-329af3577426',
    updated_at = NOW()
WHERE lower(email) = 'angela.g@nes.nz';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'name', 'Angela G',
  'contractor_name', 'Angela G',
  'contractor_id', (SELECT id::text FROM contractors WHERE lower(email) = 'angela.g@nes.nz' LIMIT 1),
  'company_id', '89ab75a6-7a99-42f6-91db-329af3577426',
  'company_name', 'NZ Electrical Solutions Ltd',
  'user_type', 'contractor'
)
WHERE lower(email) = 'angela.g@nes.nz';
*/

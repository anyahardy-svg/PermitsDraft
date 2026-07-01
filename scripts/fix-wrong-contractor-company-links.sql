-- =============================================================================
-- Find contractors whose email matches one company's contact_email but whose
-- contractors.company_id points at a different company.
--
-- Example: annab@globalsecurity.co.nz is Global Security's contact but linked
-- to Engineering & Plant Services in contractors.
-- =============================================================================

-- STEP 1: Preview mismatches
SELECT
  c.id AS contractor_id,
  c.name AS contractor_name,
  c.email AS contractor_email,
  c.company_id AS contractor_company_id,
  co_contractor.name AS contractor_company_name,
  co_contact.id AS contact_company_id,
  co_contact.name AS contact_company_name,
  co_contact.contact_email
FROM contractors c
JOIN companies co_contractor ON co_contractor.id = c.company_id
JOIN companies co_contact ON (
  lower(co_contact.contact_email) = lower(c.email)
  OR lower(co_contact.email) = lower(c.email)
)
WHERE c.email IS NOT NULL
  AND c.company_id <> co_contact.id
ORDER BY c.email;

-- STEP 2: Preview Anna / Global Security specifically
SELECT
  u.email,
  u.raw_user_meta_data->>'user_type' AS user_type,
  u.raw_user_meta_data->>'company_id' AS auth_company_id,
  u.raw_user_meta_data->>'contractor_id' AS auth_contractor_id,
  c.id AS contractor_row_id,
  c.company_id AS contractor_row_company_id,
  co.name AS contractor_row_company,
  gs.id AS global_security_company_id,
  gs.name AS global_security_name
FROM auth.users u
LEFT JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
LEFT JOIN companies co ON co.id = c.company_id
LEFT JOIN companies gs ON lower(gs.contact_email) = lower(u.email)
WHERE lower(u.email) = 'annab@globalsecurity.co.nz';

-- -----------------------------------------------------------------------------
-- STEP 3A: PREVIEW — fix contractor row to contact company (Global Security)
-- -----------------------------------------------------------------------------
SELECT
  c.id,
  c.email,
  c.company_id AS was_company_id,
  co_contact.id AS will_be_company_id,
  co_contact.name AS will_be_company_name
FROM contractors c
JOIN companies co_contact ON lower(co_contact.contact_email) = lower(c.email)
WHERE lower(c.email) = 'annab@globalsecurity.co.nz'
  AND c.company_id <> co_contact.id;

-- APPLY (uncomment after preview):
-- UPDATE contractors c
-- SET company_id = co_contact.id
-- FROM companies co_contact
-- WHERE lower(co_contact.contact_email) = lower(c.email)
--   AND c.id = c.id
--   AND lower(c.email) = 'annab@globalsecurity.co.nz'
--   AND c.company_id <> co_contact.id;

-- Simpler single-row apply for Anna:
-- UPDATE contractors
-- SET company_id = 'bbf1d097-5a7d-485a-92ae-98bfb21eac14'
-- WHERE id = 'efc4fe74-7c64-46ce-a7d2-14558de12c98';

-- -----------------------------------------------------------------------------
-- STEP 3B: PREVIEW — re-sync auth metadata after contractor row fix
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'company_id' AS was_auth_company_id,
  c.company_id AS will_be_company_id,
  co.name AS will_be_company_name,
  CASE
    WHEN lower(co.contact_email) = lower(u.email) THEN 'admin_staff'
    ELSE 'contractor'
  END AS will_be_user_type
FROM auth.users u
JOIN contractors c ON lower(c.email) = lower(u.email)
JOIN companies co ON co.id = c.company_id
WHERE lower(u.email) = 'annab@globalsecurity.co.nz';

-- APPLY auth metadata (uncomment after preview):
-- UPDATE auth.users u
-- SET raw_user_meta_data = raw_user_meta_data
--   || jsonb_build_object(
--     'company_id', 'bbf1d097-5a7d-485a-92ae-98bfb21eac14',
--     'user_type', 'admin_staff',
--     'contractor_id', null,
--     'contractor_name', null,
--     'company_name', 'Global Security'
--   )
-- WHERE lower(u.email) = 'annab@globalsecurity.co.nz';

-- -----------------------------------------------------------------------------
-- STEP 4: Grant company_admin_access if missing
-- -----------------------------------------------------------------------------
SELECT * FROM company_admin_access
WHERE lower(email) = 'annab@globalsecurity.co.nz';

-- APPLY:
-- INSERT INTO company_admin_access (email, company_id, name, granted_at)
-- VALUES (
--   'annab@globalsecurity.co.nz',
--   'bbf1d097-5a7d-485a-92ae-98bfb21eac14',
--   'Anna Barragan',
--   now()
-- )
-- ON CONFLICT (company_id, email) DO UPDATE
-- SET granted_at = EXCLUDED.granted_at;

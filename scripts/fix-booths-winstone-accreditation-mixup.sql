-- =============================================================================
-- Fix Booths Transport accreditation saved on Winstone Aggregates company row
--
-- Problem: genevieve.power@booths.co.nz filled accreditation against Winstone's
-- companies.id (faf93bef...) instead of Booths (707aa342...). Winstone's row
-- also has Booths' contact_email duplicated.
--
-- Run ONE step at a time in Supabase SQL Editor. Preview before APPLY blocks.
-- =============================================================================

-- UUIDs (from companies export)
-- Booths Transport (TA Booths Logistics): 707aa342-3d1c-4906-b379-85a5b808bfab
-- Winstone Aggregates:                    faf93bef-1f88-4920-9b0d-bb72ccf8b7c7

-- Storage folder names (sanitize_company_name pattern)
-- winstone_aggregates
-- booths_transport_ta_booths_logistics


-- -----------------------------------------------------------------------------
-- STEP 0: Preview both company rows (contacts + accreditation summary)
-- -----------------------------------------------------------------------------
SELECT
  id,
  name,
  email AS company_email_field,
  contact_name,
  contact_surname,
  contact_email,
  contact_phone,
  accreditation_status,
  accreditation_invitation_sent_at,
  accreditation_deadline,
  totika_prequalified,
  totika_certificate_url,
  approved_services,
  fletcher_business_units,
  accreditation_last_updated
FROM companies
WHERE id IN (
  '707aa342-3d1c-4906-b379-85a5b808bfab',
  'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'
)
ORDER BY name;


-- -----------------------------------------------------------------------------
-- STEP 0b: Preview auth user + company_admin_access for Genevieve
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'user_type' AS user_type,
  u.raw_user_meta_data->>'company_id' AS auth_company_id,
  u.raw_user_meta_data->>'company_name' AS auth_company_name,
  EXISTS (
    SELECT 1 FROM contractors ct WHERE lower(ct.email) = lower(u.email)
  ) AS has_contractor_row
FROM auth.users u
WHERE lower(u.email) = 'genevieve.power@booths.co.nz';

SELECT
  caa.company_id,
  c.name AS company_name,
  caa.email,
  caa.granted_at
FROM company_admin_access caa
JOIN companies c ON c.id = caa.company_id
WHERE lower(caa.email) = 'genevieve.power@booths.co.nz'
ORDER BY caa.granted_at DESC;


-- -----------------------------------------------------------------------------
-- STEP 1: Preview accreditation columns that differ (non-null on Winstone only)
-- -----------------------------------------------------------------------------
WITH accreditation_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name NOT IN (
      'id', 'name', 'email', 'created_at', 'updated_at',
      'contact_name', 'contact_surname', 'contact_email', 'contact_phone',
      'business_unit_ids', 'is_deleted', 'deleted_at'
    )
    AND (
      column_name LIKE '%\_exists' ESCAPE '\'
      OR column_name LIKE '%\_score' ESCAPE '\'
      OR column_name LIKE '%\_url' ESCAPE '\'
      OR column_name LIKE '%\_expiry%' ESCAPE '\'
      OR column_name LIKE '%\_uploaded\_at' ESCAPE '\'
      OR column_name LIKE '%\_yesno' ESCAPE '\'
      OR column_name LIKE '%\_frequency' ESCAPE '\'
      OR column_name LIKE '%\_equipment' ESCAPE '\'
      OR column_name LIKE '%\_library\_item\_id' ESCAPE '\'
      OR column_name IN (
        'nzbn', 'address_1', 'address_2', 'address_city', 'address_postcode',
        'approved_services', 'fletcher_business_units',
        'accreditation_status', 'accreditation_last_updated', 'accreditation_expiry_date',
        'accreditation_invitation_sent_at', 'accreditation_deadline',
        'fatalities', 'serious_harm', 'lost_time', 'property_damage',
        'pending_prosecutions', 'prosecutions_5_years',
        'training_records_status', 'training_records_submitted_at',
        'training_records_approved_at', 'training_records_last_modified_at',
        'training_records_approved_by', 'training_records_total', 'training_records_approved',
        'public_liability_insurance_expiry', 'last_insurance_expiry_notification_sent_at'
      )
    )
)
SELECT ac.column_name
FROM accreditation_columns ac
WHERE EXISTS (
  SELECT 1
  FROM companies w
  WHERE w.id = 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'
    AND to_jsonb(w)->>ac.column_name IS NOT NULL
    AND to_jsonb(w)->>ac.column_name NOT IN ('false', '0', '[]', '""', 'no', 'none', 'in-progress')
);


-- -----------------------------------------------------------------------------
-- STEP 2A APPLY: Copy accreditation payload Winstone → Booths
-- Rewrites storage URLs: winstone_aggregates → booths_transport_ta_booths_logistics
-- Preserves Booths identity fields (name, contact_*).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  booths_id constant uuid := '707aa342-3d1c-4906-b379-85a5b808bfab';
  winstone_id constant uuid := 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7';
  src_folder constant text := 'winstone_aggregates';
  dst_folder constant text := 'booths_transport_ta_booths_logistics';
  col record;
  set_parts text[] := ARRAY[]::text[];
  sql text;
BEGIN
  FOR col IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name NOT IN (
        'id', 'name', 'email', 'created_at', 'updated_at',
        'contact_name', 'contact_surname', 'contact_email', 'contact_phone',
        'business_unit_ids', 'is_deleted', 'deleted_at'
      )
      AND (
        column_name LIKE '%\_exists' ESCAPE '\'
        OR column_name LIKE '%\_score' ESCAPE '\'
        OR column_name LIKE '%\_url' ESCAPE '\'
        OR column_name LIKE '%\_expiry%' ESCAPE '\'
        OR column_name LIKE '%\_uploaded\_at' ESCAPE '\'
        OR column_name LIKE '%\_yesno' ESCAPE '\'
        OR column_name LIKE '%\_frequency' ESCAPE '\'
        OR column_name LIKE '%\_equipment' ESCAPE '\'
        OR column_name LIKE '%\_library\_item\_id' ESCAPE '\'
        OR column_name IN (
          'nzbn', 'address_1', 'address_2', 'address_city', 'address_postcode',
          'approved_services', 'fletcher_business_units',
          'accreditation_status', 'accreditation_last_updated', 'accreditation_expiry_date',
          'accreditation_invitation_sent_at', 'accreditation_deadline',
          'fatalities', 'serious_harm', 'lost_time', 'property_damage',
          'pending_prosecutions', 'prosecutions_5_years',
          'training_records_status', 'training_records_submitted_at',
          'training_records_approved_at', 'training_records_last_modified_at',
          'training_records_approved_by', 'training_records_total', 'training_records_approved',
          'public_liability_insurance_expiry', 'last_insurance_expiry_notification_sent_at'
        )
      )
    ORDER BY column_name
  LOOP
    IF col.column_name LIKE '%\_url' ESCAPE '\' THEN
      set_parts := array_append(
        set_parts,
        format(
          '%I = CASE
            WHEN w.%I IS NULL THEN b.%I
            ELSE replace(w.%I::text, %L, %L)
          END',
          col.column_name, col.column_name, col.column_name,
          col.column_name, src_folder, dst_folder
        )
      );
    ELSE
      set_parts := array_append(
        set_parts,
        format('%I = COALESCE(w.%I, b.%I)', col.column_name, col.column_name, col.column_name)
      );
    END IF;
  END LOOP;

  sql := format(
    'UPDATE companies b
     SET %s, updated_at = NOW()
     FROM companies w
     WHERE b.id = %L AND w.id = %L',
    array_to_string(set_parts, ', '),
    booths_id,
    winstone_id
  );

  EXECUTE sql;
END $$;


-- -----------------------------------------------------------------------------
-- STEP 2B APPLY: Clear Booths contact from Winstone + reset Winstone accreditation
-- Winstone Aggregates is not Booths; remove Genevieve as contact and wipe
-- supplier questionnaire data from the Winstone company row.
-- -----------------------------------------------------------------------------
UPDATE companies
SET
  contact_name = NULL,
  contact_surname = NULL,
  contact_email = NULL,
  contact_phone = NULL,
  updated_at = NOW()
WHERE id = 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'
  AND lower(contact_email) = 'genevieve.power@booths.co.nz';

DO $$
DECLARE
  winstone_id constant uuid := 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7';
  col record;
  set_parts text[] := ARRAY[]::text[];
  sql text;
BEGIN
  FOR col IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name NOT IN (
        'id', 'name', 'email', 'created_at', 'updated_at',
        'contact_name', 'contact_surname', 'contact_email', 'contact_phone',
        'business_unit_ids', 'is_deleted', 'deleted_at'
      )
      AND (
        column_name LIKE '%\_exists' ESCAPE '\'
        OR column_name LIKE '%\_score' ESCAPE '\'
        OR column_name LIKE '%\_url' ESCAPE '\'
        OR column_name LIKE '%\_expiry%' ESCAPE '\'
        OR column_name LIKE '%\_uploaded\_at' ESCAPE '\'
        OR column_name LIKE '%\_yesno' ESCAPE '\'
        OR column_name LIKE '%\_frequency' ESCAPE '\'
        OR column_name LIKE '%\_equipment' ESCAPE '\'
        OR column_name LIKE '%\_library\_item\_id' ESCAPE '\'
        OR column_name IN (
          'nzbn', 'address_1', 'address_2', 'address_city', 'address_postcode',
          'approved_services', 'fletcher_business_units',
          'accreditation_status', 'accreditation_last_updated', 'accreditation_expiry_date',
          'accreditation_invitation_sent_at', 'accreditation_deadline',
          'fatalities', 'serious_harm', 'lost_time', 'property_damage',
          'pending_prosecutions', 'prosecutions_5_years',
          'training_records_status', 'training_records_submitted_at',
          'training_records_approved_at', 'training_records_last_modified_at',
          'training_records_approved_by', 'training_records_total', 'training_records_approved',
          'public_liability_insurance_expiry', 'last_insurance_expiry_notification_sent_at'
        )
      )
    ORDER BY column_name
  LOOP
    IF col.data_type = 'boolean' THEN
      set_parts := array_append(set_parts, format('%I = FALSE', col.column_name));
    ELSIF col.data_type IN ('integer', 'bigint', 'smallint') THEN
      IF col.column_name LIKE '%\_frequency' ESCAPE '\' THEN
        set_parts := array_append(set_parts, format('%I = 1', col.column_name));
      ELSE
        set_parts := array_append(set_parts, format('%I = 0', col.column_name));
      END IF;
    ELSIF col.data_type = 'jsonb' OR col.data_type = 'json' THEN
      set_parts := array_append(set_parts, format('%I = ''[]''::jsonb', col.column_name));
    ELSIF col.column_name = 'accreditation_status' THEN
      set_parts := array_append(set_parts, format('%I = ''in-progress''', col.column_name));
    ELSIF col.column_name = 'training_records_status' THEN
      set_parts := array_append(set_parts, format('%I = ''none''', col.column_name));
    ELSIF col.column_name LIKE '%\_yesno' ESCAPE '\' THEN
      set_parts := array_append(set_parts, format('%I = ''no''', col.column_name));
    ELSE
      set_parts := array_append(set_parts, format('%I = NULL', col.column_name));
    END IF;
  END LOOP;

  sql := format(
    'UPDATE companies SET %s, updated_at = NOW() WHERE id = %L',
    array_to_string(set_parts, ', '),
    winstone_id
  );

  EXECUTE sql;
END $$;


-- -----------------------------------------------------------------------------
-- STEP 3A APPLY: Point Genevieve auth user → Booths (admin_staff)
-- -----------------------------------------------------------------------------
UPDATE auth.users u
SET raw_user_meta_data =
  COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'user_type', 'admin_staff',
    'company_id', '707aa342-3d1c-4906-b379-85a5b808bfab',
    'company_name', 'Booths Transport (TA Booths Logistics)',
    'name', 'Genevieve Power'
  )
WHERE lower(u.email) = 'genevieve.power@booths.co.nz';


-- -----------------------------------------------------------------------------
-- STEP 3B APPLY: Fix company_admin_access (remove Winstone, grant Booths)
-- -----------------------------------------------------------------------------
DELETE FROM company_admin_access
WHERE lower(email) = 'genevieve.power@booths.co.nz'
  AND company_id = 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7';

INSERT INTO company_admin_access (company_id, email, name, granted_at)
VALUES (
  '707aa342-3d1c-4906-b379-85a5b808bfab',
  'genevieve.power@booths.co.nz',
  'Genevieve Power',
  NOW()
)
ON CONFLICT (company_id, email) DO UPDATE
SET name = EXCLUDED.name,
    granted_at = EXCLUDED.granted_at;


-- -----------------------------------------------------------------------------
-- STEP 4: Verify after apply
-- -----------------------------------------------------------------------------
SELECT
  id,
  name,
  contact_email,
  accreditation_status,
  totika_prequalified,
  totika_certificate_url,
  accreditation_invitation_sent_at
FROM companies
WHERE id IN (
  '707aa342-3d1c-4906-b379-85a5b808bfab',
  'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7'
)
ORDER BY name;

SELECT
  u.email,
  u.raw_user_meta_data->>'user_type' AS user_type,
  u.raw_user_meta_data->>'company_id' AS auth_company_id,
  c.name AS auth_company_name
FROM auth.users u
LEFT JOIN companies c ON c.id = (u.raw_user_meta_data->>'company_id')::uuid
WHERE lower(u.email) = 'genevieve.power@booths.co.nz';

SELECT caa.company_id, c.name, caa.email
FROM company_admin_access caa
JOIN companies c ON c.id = caa.company_id
WHERE lower(caa.email) = 'genevieve.power@booths.co.nz';


-- -----------------------------------------------------------------------------
-- STEP 5 (manual): Supabase Storage — move certificate files if needed
-- -----------------------------------------------------------------------------
-- Database URLs are rewritten to booths_transport_ta_booths_logistics/...
-- If files still live under accreditations/winstone_aggregates/..., either:
--   a) Move/copy objects in Supabase Storage to booths_transport_ta_booths_logistics/, or
--   b) Re-upload certificates from the Booths accreditation screen after login.
--
-- Example path from export:
--   .../accreditations/winstone_aggregates/totika_prequalified/1781226717988.pdf
-- Should become:
--   .../accreditations/booths_transport_ta_booths_logistics/totika_prequalified/1781226717988.pdf

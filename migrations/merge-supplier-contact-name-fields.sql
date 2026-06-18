-- Migration: Merge supplier contact_surname into tech_contact_name
-- Purpose: Use a single full-name field for supplier primary contacts
-- Date: June 18, 2026

UPDATE suppliers
SET tech_contact_name = NULLIF(
  trim(
    concat_ws(' ',
      NULLIF(trim(coalesce(tech_contact_name, '')), ''),
      NULLIF(trim(coalesce(contact_surname, '')), '')
    )
  ),
  ''
)
WHERE contact_surname IS NOT NULL
  AND trim(contact_surname) <> '';

UPDATE supplier_accreditations
SET accreditation_data = (accreditation_data - 'contact_surname')
  || jsonb_build_object(
    'tech_contact_name',
    NULLIF(
      trim(
        concat_ws(' ',
          NULLIF(trim(coalesce(accreditation_data->>'tech_contact_name', '')), ''),
          NULLIF(trim(coalesce(accreditation_data->>'contact_surname', '')), '')
        )
      ),
      ''
    )
  )
WHERE accreditation_data ? 'contact_surname';

ALTER TABLE suppliers DROP COLUMN IF EXISTS contact_surname;

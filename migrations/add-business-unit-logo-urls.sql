-- Store Supabase Storage paths for business unit email logos.
-- Full public URLs are built at runtime from VITE_SUPABASE_URL + bucket + path.

ALTER TABLE business_units
ADD COLUMN IF NOT EXISTS logo_storage_path TEXT;

COMMENT ON COLUMN business_units.logo_storage_path IS
  'Path inside the email-assets bucket, e.g. logos/winstone-logo.svg';

UPDATE business_units
SET logo_storage_path = 'logos/winstone-logo.svg'
WHERE name = 'Winstone Aggregates'
  AND (logo_storage_path IS NULL OR logo_storage_path = '');

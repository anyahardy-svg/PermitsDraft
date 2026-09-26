-- Step 2e: Private accreditations storage bucket (company accreditation uploads + evidence library).
-- Run ONLY AFTER:
--   1) company-data v7+ deployed (createAccreditationsSignedUrl)
--   2) Production frontend uses accreditationsStorage.js / signed URLs
--
-- Contractors: Supabase Auth + authenticated storage policies.
-- Admin document view: company-data signed URLs (requestingAdminId).

UPDATE storage.buckets
SET public = false
WHERE id = 'accreditations';

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%accreditation%'
        OR policyname ILIKE '%accreditations%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "authenticated_accreditations_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'accreditations');

CREATE POLICY "authenticated_accreditations_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'accreditations');

CREATE POLICY "authenticated_accreditations_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'accreditations')
  WITH CHECK (bucket_id = 'accreditations');

CREATE POLICY "authenticated_accreditations_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'accreditations');

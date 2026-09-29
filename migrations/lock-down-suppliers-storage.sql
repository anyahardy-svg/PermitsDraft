-- Step 2d-storage: Private suppliers storage bucket (technical documents).
-- Run ONLY AFTER:
--   1) Vercel deploy with signed URL API + supplier form View uses /api/create-supplier-document-signed-url
--   2) uploads return storage paths (not public URLs)
--
-- Uploads/reads for admin + token form: Vercel service role (upload-supplier-document, signed URL API).
-- Anon cannot list or download objects from this bucket.

UPDATE storage.buckets
SET public = false
WHERE id = 'suppliers';

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%supplier%'
        OR policyname ILIKE '%suppliers%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- No anon/authenticated storage policies: access only via service role + signed URLs from your APIs.

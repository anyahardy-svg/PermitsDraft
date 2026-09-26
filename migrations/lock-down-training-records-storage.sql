-- Step 2d: Private training-records storage bucket (matrices + individual record files).
-- Run ONLY AFTER:
--   1) company-data v6+ deployed (createTrainingRecordsSignedUrl for admin downloads)
--   2) Production frontend uses signed URLs (trainingRecordsStorage.js)
--
-- Makes bucket private and removes anon storage access. Contractors use Supabase Auth + authenticated policies.

UPDATE storage.buckets
SET public = false
WHERE id = 'training-records';

-- Drop permissive / anon policies (names vary by environment).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%training record%'
        OR policyname ILIKE '%training-record%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "authenticated_training_records_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'training-records');

CREATE POLICY "authenticated_training_records_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'training-records');

CREATE POLICY "authenticated_training_records_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'training-records')
  WITH CHECK (bucket_id = 'training-records');

CREATE POLICY "authenticated_training_records_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'training-records');

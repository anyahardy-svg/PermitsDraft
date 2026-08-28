-- Allow admin/kiosk uploads to training-records bucket via anon key
-- The admin panel uses custom admin_users auth with the Supabase anon key,
-- not Supabase JWT sessions, so storage policies must allow the anon role.

DROP POLICY IF EXISTS "Allow training record uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow training record access" ON storage.objects;
DROP POLICY IF EXISTS "Allow training record deletion" ON storage.objects;
DROP POLICY IF EXISTS "Allow training record updates" ON storage.objects;

DROP POLICY IF EXISTS "Allow anon training record uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon training record access" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon training record deletion" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon training record updates" ON storage.objects;

CREATE POLICY "Allow anon training record uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'training-records');

CREATE POLICY "Allow anon training record access" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'training-records');

CREATE POLICY "Allow anon training record deletion" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'training-records');

CREATE POLICY "Allow anon training record updates" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'training-records')
  WITH CHECK (bucket_id = 'training-records');

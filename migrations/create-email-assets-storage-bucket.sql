-- Create public Supabase Storage bucket for email branding assets (logos, etc.)
-- Run in Supabase Dashboard -> SQL Editor, then upload files with:
--   node scripts/upload-email-logos.js

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access (required for email clients to load images)
DROP POLICY IF EXISTS "Public read access for email assets" ON storage.objects;
CREATE POLICY "Public read access for email assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'email-assets');

-- Service role / authenticated admins can upload and replace logos
DROP POLICY IF EXISTS "Authenticated upload for email assets" ON storage.objects;
CREATE POLICY "Authenticated upload for email assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'email-assets'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated update for email assets" ON storage.objects;
CREATE POLICY "Authenticated update for email assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'email-assets'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated delete for email assets" ON storage.objects;
CREATE POLICY "Authenticated delete for email assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'email-assets'
  AND auth.role() = 'authenticated'
);

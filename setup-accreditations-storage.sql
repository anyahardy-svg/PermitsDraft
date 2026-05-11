-- Supabase Storage RLS Policies for accreditations bucket
-- Run these SQL statements in Supabase Dashboard → SQL Editor

-- ============================================================================
-- CREATE ACCREDITATIONS STORAGE BUCKET
-- ============================================================================

-- First, insert the bucket metadata
INSERT INTO storage.buckets (id, name, owner, public)
VALUES ('accreditations', 'accreditations', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES FOR accreditations BUCKET
-- ============================================================================

-- Policy 1: Allow authenticated users (contractors/admins) to upload files
CREATE POLICY "Allow authenticated users to upload accreditations"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'accreditations'
  AND auth.role() = 'authenticated'
);

-- Policy 2: Allow anyone to read/download files (public documents)
CREATE POLICY "Allow public read access to accreditations"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'accreditations'
);

-- Policy 3: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete accreditations"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'accreditations'
  AND auth.role() = 'authenticated'
);

-- Policy 4: Allow authenticated users to update file metadata
CREATE POLICY "Allow authenticated users to update accreditations"
ON storage.objects
FOR UPDATE
WITH CHECK (
  bucket_id = 'accreditations'
  AND auth.role() = 'authenticated'
);

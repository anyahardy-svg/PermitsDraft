-- Supabase Storage RLS Policies for permit-attachments bucket
-- Run these SQL statements in Supabase Dashboard → SQL Editor

-- Policy 1: Allow authenticated users to upload files to the bucket
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'permit-attachments' 
  AND auth.role() = 'authenticated'
);

-- Policy 2: Allow anyone to read/view files in the bucket
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'permit-attachments'
);

-- Policy 3: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'permit-attachments' 
  AND auth.role() = 'authenticated'
);

-- Policy 4: Allow authenticated users to update file metadata
CREATE POLICY "Allow authenticated users to update" ON storage.objects
FOR UPDATE
WITH CHECK (
  bucket_id = 'permit-attachments' 
  AND auth.role() = 'authenticated'
);

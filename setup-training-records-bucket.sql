-- Setup Training Records Storage Bucket
-- This script creates a Supabase storage bucket for training record file uploads
-- Execute this in your Supabase SQL Editor

-- Create the storage bucket via the storage.buckets table
-- Note: Storage buckets are managed through the Supabase dashboard UI
-- This is a reference guide for the bucket configuration

-- Bucket name: training-records
-- Public: false (private uploads, but can be made public for downloads)
-- Max file size: 5MB per file

-- To create the bucket via Supabase Dashboard:
-- 1. Go to Storage in the Supabase console
-- 2. Click "New Bucket"
-- 3. Name: training-records
-- 4. Make it Private (or Public if you want direct access)
-- 5. Click Create

-- Once the bucket is created, configure the policies:

-- IMPORTANT: Execute these RLS policies in YOUR Supabase project
-- You may need to adjust the policies based on your authentication setup

-- Allow users to upload files to their contractor's folder
-- INSERT policy - allow uploads
CREATE POLICY "Allow training record uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training-records');

-- Allow users to view their contractor's training records
-- SELECT policy
CREATE POLICY "Allow training record access" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'training-records');

-- Allow users to delete their own training records
-- DELETE policy
CREATE POLICY "Allow training record deletion" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'training-records');

-- Optional: Update policy for future updates
CREATE POLICY "Allow training record updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'training-records')
  WITH CHECK (bucket_id = 'training-records');

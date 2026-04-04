-- Add pdf_storage_filename to track actual storage filenames for proper deletion
-- This column stores the filename used when uploading to Supabase Storage

ALTER TABLE inductions
ADD COLUMN IF NOT EXISTS pdf_storage_filename TEXT;

ALTER TABLE visitor_inductions
ADD COLUMN IF NOT EXISTS pdf_storage_filename TEXT;

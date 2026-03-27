-- Add PDF file support to inductions tables

-- Add pdf_file_url to inductions table
ALTER TABLE inductions 
ADD COLUMN IF NOT EXISTS pdf_file_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT,
ADD COLUMN IF NOT EXISTS pdf_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add pdf_file_url to visitor_inductions table
ALTER TABLE visitor_inductions 
ADD COLUMN IF NOT EXISTS pdf_file_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT,
ADD COLUMN IF NOT EXISTS pdf_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add pdf_viewed flag to contractor_induction_progress for tracking
ALTER TABLE contractor_induction_progress 
ADD COLUMN IF NOT EXISTS pdf_viewed BOOLEAN DEFAULT FALSE;

-- Create inductions-pdf storage bucket if it doesn't exist
-- Note: This should be done via Supabase Dashboard or API, not raw SQL
-- ALTER BUCKET inductions-pdf SET public TO true;

-- Add comment for documentation
COMMENT ON COLUMN inductions.pdf_file_url IS 'URL to PDF file stored in Supabase Storage (inductions-pdf bucket)';
COMMENT ON COLUMN inductions.pdf_file_name IS 'Original filename of uploaded PDF';
COMMENT ON COLUMN inductions.pdf_uploaded_at IS 'Timestamp when PDF was uploaded';
COMMENT ON COLUMN visitor_inductions.pdf_file_url IS 'URL to PDF file stored in Supabase Storage (inductions-pdf bucket)';
COMMENT ON COLUMN visitor_inductions.pdf_file_name IS 'Original filename of uploaded PDF';
COMMENT ON COLUMN visitor_inductions.pdf_uploaded_at IS 'Timestamp when PDF was uploaded';
COMMENT ON COLUMN contractor_induction_progress.pdf_viewed IS 'Whether contractor has viewed the PDF induction';

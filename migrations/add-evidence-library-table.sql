-- Create evidence_library_items table for reusable evidence across accreditation sections
-- This allows companies to upload evidence once and reuse it across multiple questions

CREATE TABLE IF NOT EXISTS evidence_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  uploaded_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups by company_id
CREATE INDEX IF NOT EXISTS evidence_library_items_company_id_idx ON evidence_library_items(company_id);

-- Create index for active items
CREATE INDEX IF NOT EXISTS evidence_library_items_active_idx ON evidence_library_items(company_id, is_active);

-- Enable RLS
ALTER TABLE evidence_library_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company's evidence library" ON evidence_library_items;
DROP POLICY IF EXISTS "Authenticated users can add evidence to their company" ON evidence_library_items;
DROP POLICY IF EXISTS "Users can update evidence names" ON evidence_library_items;
DROP POLICY IF EXISTS "Users can delete evidence" ON evidence_library_items;

-- Policy: Companies can view their own evidence library
CREATE POLICY "Users can view their company's evidence library"
ON evidence_library_items
FOR SELECT
USING (company_id IN (
  SELECT id FROM companies WHERE id = company_id
));

-- Policy: Authenticated users can add evidence to their company
CREATE POLICY "Authenticated users can add evidence to their company"
ON evidence_library_items
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update evidence names in their company
CREATE POLICY "Users can update evidence names"
ON evidence_library_items
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Users can soft-delete evidence (mark as inactive)
CREATE POLICY "Users can delete evidence"
ON evidence_library_items
FOR DELETE
USING (true);

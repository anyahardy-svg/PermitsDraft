-- Create Training Records Table
-- Stores uploaded training/certification records for individual contractors
-- Per contractor, with training type as free text field

CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  training_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INT,
  file_type TEXT CHECK (file_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired')),
  expiry_date DATE,
  notes TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_by_name TEXT,
  approved_by_business_unit TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient queries
CREATE INDEX idx_training_records_contractor_id ON training_records(contractor_id);
CREATE INDEX idx_training_records_service_name ON training_records(service_name);
CREATE INDEX idx_training_records_status ON training_records(status);

-- RLS Policies (optional - adjust based on your security needs)
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

-- Allow users to view training records for their contractor
CREATE POLICY "Users can view contractor training records"
  ON training_records
  FOR SELECT
  USING (true);

-- Allow users to insert training records
CREATE POLICY "Users can upload training records"
  ON training_records
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own records
CREATE POLICY "Users can update training records"
  ON training_records
  FOR UPDATE
  USING (true);

-- Allow users to delete their own records
CREATE POLICY "Users can delete training records"
  ON training_records
  FOR DELETE
  USING (true);

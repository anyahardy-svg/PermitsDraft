-- Company Training Matrices
-- Stores company-level training matrix documents covering multiple contractors

CREATE TABLE IF NOT EXISTS company_training_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INT,
  file_type TEXT CHECK (file_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired')),
  expiry_date DATE,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_by_name TEXT,
  approved_by_business_unit TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_training_matrix_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES company_training_matrices(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(matrix_id, contractor_id)
);

CREATE INDEX IF NOT EXISTS idx_company_training_matrices_company_id ON company_training_matrices(company_id);
CREATE INDEX IF NOT EXISTS idx_company_training_matrices_status ON company_training_matrices(status);
CREATE INDEX IF NOT EXISTS idx_company_training_matrix_contractors_matrix_id ON company_training_matrix_contractors(matrix_id);
CREATE INDEX IF NOT EXISTS idx_company_training_matrix_contractors_contractor_id ON company_training_matrix_contractors(contractor_id);

ALTER TABLE company_training_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_training_matrix_contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company training matrices"
  ON company_training_matrices FOR SELECT USING (true);

CREATE POLICY "Users can insert company training matrices"
  ON company_training_matrices FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update company training matrices"
  ON company_training_matrices FOR UPDATE USING (true);

CREATE POLICY "Users can delete company training matrices"
  ON company_training_matrices FOR DELETE USING (true);

CREATE POLICY "Users can view matrix contractor links"
  ON company_training_matrix_contractors FOR SELECT USING (true);

CREATE POLICY "Users can insert matrix contractor links"
  ON company_training_matrix_contractors FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete matrix contractor links"
  ON company_training_matrix_contractors FOR DELETE USING (true);

-- Separate counters for site admin matrix column (individual records counters unchanged)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_matrices_total INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_matrices_approved INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_companies_training_matrices_total ON companies(training_matrices_total);
CREATE INDEX IF NOT EXISTS idx_companies_training_matrices_approved ON companies(training_matrices_approved);

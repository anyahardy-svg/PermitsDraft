-- Add contractor_type column to companies table
ALTER TABLE companies 
ADD COLUMN contractor_type TEXT DEFAULT 'D' CHECK (contractor_type IN ('A', 'B', 'C', 'D'));

-- Add comment to explain the types
COMMENT ON COLUMN companies.contractor_type IS 'Contractor Type: A=Major Work, B=High Risk, C=Medium Risk, D=Low Risk';

-- Create index for filtering by contractor type
CREATE INDEX idx_companies_contractor_type ON companies(contractor_type);

-- Add training records counters to companies table
-- These allow fast status calculation without querying all records

ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_total INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_approved INTEGER DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_training_records_total ON companies(training_records_total);
CREATE INDEX IF NOT EXISTS idx_companies_training_records_approved ON companies(training_records_approved);

-- Update existing companies with correct counts from current records
UPDATE companies SET 
  training_records_total = (
    SELECT COUNT(*) FROM training_records 
    WHERE training_records.contractor_id IN (
      SELECT id FROM contractors WHERE contractors.company_id = companies.id
    )
  ),
  training_records_approved = (
    SELECT COUNT(*) FROM training_records 
    WHERE training_records.contractor_id IN (
      SELECT id FROM contractors WHERE contractors.company_id = companies.id
    )
    AND training_records.status = 'approved'
  );

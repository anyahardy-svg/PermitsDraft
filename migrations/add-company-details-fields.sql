-- Add additional company details fields to companies table
-- Migration: Add Company Details Fields

ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_active BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_manager TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pre_qualification_approved BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS abn_nzbn TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_1 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_postcode TEXT;

-- Create indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_companies_abn_nzbn ON companies(abn_nzbn);
CREATE INDEX IF NOT EXISTS idx_companies_company_active ON companies(company_active);
CREATE INDEX IF NOT EXISTS idx_companies_pre_qualification_approved ON companies(pre_qualification_approved);

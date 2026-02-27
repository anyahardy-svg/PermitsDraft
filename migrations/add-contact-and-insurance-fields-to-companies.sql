-- Migration: Add contact and insurance fields to companies table
-- Purpose: Store contact information and insurance/accreditation dates

ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_surname TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS public_liability_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS motor_vehicle_insurance_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accredited_date DATE;

-- Create indexes for date fields for faster filtering
CREATE INDEX IF NOT EXISTS idx_companies_public_liability_expiry ON companies(public_liability_expiry);
CREATE INDEX IF NOT EXISTS idx_companies_motor_vehicle_expiry ON companies(motor_vehicle_insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_companies_review_date ON companies(review_date);
CREATE INDEX IF NOT EXISTS idx_companies_accredited_date ON companies(accredited_date);

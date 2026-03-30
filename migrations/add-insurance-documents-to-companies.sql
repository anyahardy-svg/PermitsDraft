-- Migration: Add Insurance Document Fields to Companies Table
-- Purpose: Track insurance documents and expiry dates for accreditation
-- Date: March 30, 2026

-- Public Liability Insurance (Compulsory)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS public_liability_insurance_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS public_liability_insurance_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Motor Vehicle Insurance (Optional)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS motor_vehicle_insurance_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS motor_vehicle_insurance_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS motor_vehicle_insurance_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for accreditation queries
CREATE INDEX IF NOT EXISTS idx_companies_pli_url ON companies(public_liability_insurance_url);
CREATE INDEX IF NOT EXISTS idx_companies_motor_insurance_expiry ON companies(motor_vehicle_insurance_expiry);

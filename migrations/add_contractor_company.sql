-- Add contractor_company column to permits table
-- Run this in your Supabase SQL Editor to update existing permits table

ALTER TABLE permits
ADD COLUMN contractor_company TEXT;

-- Add index on contractor_company for faster queries
CREATE INDEX idx_permits_contractor_company ON permits(contractor_company);

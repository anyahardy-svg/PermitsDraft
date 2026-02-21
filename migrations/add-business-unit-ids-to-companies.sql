-- Migration: Add business_unit_ids to companies table
-- Purpose: Track which business units each company is assigned to
-- This enables multi-tenancy for companies across different BUs

ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_unit_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_companies_business_unit_ids ON companies USING GIN(business_unit_ids);


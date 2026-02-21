-- Migration: Add business_unit_ids to contractors table
-- Purpose: Allow contractors to work for multiple business units

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS business_unit_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_contractors_business_unit_ids ON contractors USING GIN(business_unit_ids);

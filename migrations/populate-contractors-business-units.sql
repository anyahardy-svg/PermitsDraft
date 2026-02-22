-- Migration: Populate contractors with business unit IDs
-- Purpose: Assign all existing contractors to their business units
-- This assumes "Winstone Aggregates" is the primary business unit for existing contractors

-- First, ensure the business_unit_ids column exists on contractors
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS business_unit_ids UUID[] DEFAULT '{}';

-- Get the Winstone Aggregates business unit ID and assign to all contractors
UPDATE contractors
SET business_unit_ids = ARRAY[
  (SELECT id FROM business_units WHERE name = 'Winstone Aggregates' LIMIT 1)
]
WHERE (business_unit_ids IS NULL OR business_unit_ids = '{}');

-- Verify the update
SELECT id, name, email, business_unit_ids FROM contractors LIMIT 5;


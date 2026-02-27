-- Migration: Populate all companies with Winstone Aggregates business unit
-- Purpose: Set all existing companies to be associated with Winstone Aggregates

-- Get the Winstone Aggregates business unit ID
WITH winstone_bu AS (
  SELECT id FROM business_units WHERE name = 'Winstone Aggregates'
)
-- Update all companies to include Winstone Aggregates in their business_unit_ids
UPDATE companies
SET business_unit_ids = 
  CASE 
    WHEN business_unit_ids IS NULL OR business_unit_ids = '{}' THEN ARRAY[(SELECT id FROM winstone_bu)]
    WHEN NOT (SELECT id FROM winstone_bu) = ANY(business_unit_ids) THEN business_unit_ids || ARRAY[(SELECT id FROM winstone_bu)]
    ELSE business_unit_ids
  END
WHERE (business_unit_ids IS NULL OR business_unit_ids = '{}' OR NOT (SELECT id FROM winstone_bu) = ANY(business_unit_ids));

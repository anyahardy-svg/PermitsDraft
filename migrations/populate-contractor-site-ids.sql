-- Migration: Add site_ids to contractors table and assign to sites
-- Purpose: Allow contractors to be filterable by site on sign-in screen

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS site_ids UUID[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_contractors_site_ids ON contractors USING GIN(site_ids);

-- Assign all Winstone contractors to all Winstone sites
UPDATE contractors
SET site_ids = (
  SELECT array_agg(id) FROM sites 
  WHERE business_unit_id = (
    SELECT id FROM business_units WHERE name = 'Winstone Aggregates' LIMIT 1
  )
)
WHERE business_unit_ids @> ARRAY[
  (SELECT id FROM business_units WHERE name = 'Winstone Aggregates' LIMIT 1)
];

-- Verify the update
SELECT id, name, email, site_ids FROM contractors LIMIT 5;


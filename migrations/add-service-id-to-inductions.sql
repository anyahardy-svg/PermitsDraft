-- Migration: Add service_id to inductions table
-- Purpose: Link inductions to services for proper UUID-based service tracking
-- Date: March 2, 2026

-- Add service_id column to inductions table
ALTER TABLE inductions 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Create index on service_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_inductions_service_id ON inductions(service_id);

-- Update existing "Working at Height" induction to link to the service
-- Note: This assumes the induction exists with induction_name = 'Working at Height'
UPDATE inductions
SET service_id = (
  SELECT id FROM services
  WHERE name = 'Working at Height'
  AND business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
  LIMIT 1
)
WHERE induction_name = 'Working at Height'
AND service_id IS NULL;

-- Update other inductions to match their corresponding services if they exist
-- This will match by name between induction_name and service.name within the same business unit
UPDATE inductions i
SET service_id = (
  SELECT s.id FROM services s
  WHERE s.name = i.induction_name
  AND s.business_unit_id = ANY(i.business_unit_ids)
  LIMIT 1
)
WHERE i.service_id IS NULL
AND i.induction_name != '';

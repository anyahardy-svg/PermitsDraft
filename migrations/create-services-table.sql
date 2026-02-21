-- Migration: Create services table
-- Purpose: Create a centralized services list per business unit to avoid spelling mistakes
-- Date: February 21, 2026

-- ============================================================================
-- 1. CREATE SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_unit_id, name)
);

CREATE INDEX IF NOT EXISTS idx_services_business_unit_id ON services(business_unit_id);

-- ============================================================================
-- 2. POPULATE SERVICES FOR WINSTONE AGGREGATES (main business unit)
-- ============================================================================

INSERT INTO services (business_unit_id, name, description) VALUES 
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Hot Work', 'Hot work permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Confined Space', 'Confined space entry permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Electrical', 'Electrical work permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Working at Height', 'Working at height permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Excavation', 'Excavation permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Lifting', 'Lifting operations permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Blasting', 'Blasting operations permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Mobile Plant Servicing', 'Mobile plant servicing permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Fixed Plant Servicing', 'Fixed plant servicing permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Conveyor Belt Servicing', 'Conveyor belt servicing permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Surveying', 'Surveying permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Environmental', 'Environmental work permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Transport Driver', 'Transport driver permit required'),
  ((SELECT id FROM business_units WHERE name = 'Winstone Aggregates'), 'Other (specify in description)', 'Other work - specify in permit description')
ON CONFLICT (business_unit_id, name) DO NOTHING;

-- ============================================================================
-- 3. POPULATE SERVICES FOR OTHER BUSINESS UNITS (copy from Winstone)
-- ============================================================================

INSERT INTO services (business_unit_id, name, description)
SELECT 
  bu.id,
  s.name,
  s.description
FROM business_units bu
CROSS JOIN services s
WHERE s.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
AND bu.name != 'Winstone Aggregates'
ON CONFLICT (business_unit_id, name) DO NOTHING;

-- ============================================================================
-- Verification queries (comment out after deployment):
-- ============================================================================

-- List all services by business unit:
-- SELECT bu.name, COUNT(s.id) as service_count FROM services s
-- JOIN business_units bu ON s.business_unit_id = bu.id
-- GROUP BY bu.id, bu.name ORDER BY bu.name;

-- List all services for a specific business unit:
-- SELECT s.name FROM services s
-- WHERE s.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
-- ORDER BY s.name;

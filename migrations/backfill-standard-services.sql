-- Backfill: ensure all 14 standard services exist after globalization
-- Run only if SELECT COUNT(*) FROM services returns fewer than 14.
-- Safe to re-run: uses ON CONFLICT (name) DO UPDATE to fill applicable BUs.

INSERT INTO services (name, description, applicable_business_unit_ids)
SELECT
  seed.name,
  seed.description,
  COALESCE(
    (SELECT ARRAY_AGG(bu.id ORDER BY bu.name) FROM business_units bu),
    '{}'::uuid[]
  )
FROM (
  VALUES
    ('Hot Work', 'Hot work permit required'),
    ('Confined Space', 'Confined space entry permit required'),
    ('Electrical', 'Electrical work permit required'),
    ('Working at Height', 'Working at height permit required'),
    ('Excavation', 'Excavation permit required'),
    ('Lifting', 'Lifting operations permit required'),
    ('Blasting', 'Blasting operations permit required'),
    ('Mobile Plant Servicing', 'Mobile plant servicing permit required'),
    ('Fixed Plant Servicing', 'Fixed plant servicing permit required'),
    ('Conveyor Servicing', 'Conveyor servicing permit required'),
    ('Surveying', 'Surveying permit required'),
    ('Environmental', 'Environmental work permit required'),
    ('Transport Driver', 'Transport driver permit required'),
    ('Other (specify in description)', 'Other work - specify in permit description')
) AS seed(name, description)
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  applicable_business_unit_ids = CASE
    WHEN COALESCE(services.applicable_business_unit_ids, '{}') = '{}'
      THEN EXCLUDED.applicable_business_unit_ids
    ELSE services.applicable_business_unit_ids
  END,
  updated_at = CURRENT_TIMESTAMP;

-- Verify:
-- SELECT COUNT(*) AS service_count FROM services;
-- SELECT name, applicable_business_unit_ids FROM services ORDER BY name;

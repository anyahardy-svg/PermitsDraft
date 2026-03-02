-- Migration: Convert all service_ids to actual service UUIDs
-- Purpose: Ensure all contractors have their service_ids pointing to actual services in the services table
-- Created: March 2, 2026

-- Step 1: For contractors with text service names, find matching services and update with UUIDs
UPDATE contractors c
SET service_ids = (
  SELECT array_agg(
    COALESCE(
      (SELECT id FROM services WHERE name = sid LIMIT 1),
      sid::uuid
    )
  )::text[]
  FROM unnest(c.service_ids) AS sid
  WHERE c.service_ids IS NOT NULL AND array_length(c.service_ids, 1) > 0
)
WHERE c.service_ids IS NOT NULL 
  AND array_length(c.service_ids, 1) > 0
  AND EXISTS (
    SELECT 1 FROM unnest(c.service_ids) AS sid 
    -- Text names that are not UUIDs
    WHERE sid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text
  );

-- Step 2: Verify the migration - show sample contractors with their services
SELECT 
  c.id, 
  c.name, 
  c.service_ids,
  (
    SELECT array_agg(s.name)
    FROM services s
    WHERE s.id::text = ANY(c.service_ids::text[])
  ) as service_names
FROM contractors c
WHERE c.service_ids IS NOT NULL AND array_length(c.service_ids, 1) > 0
LIMIT 20;

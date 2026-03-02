-- Migration: Convert UUID-based service_ids to service names
-- Run this in Supabase SQL Editor to update existing contractor data

-- Update contractors: replace all UUID-formatted service IDs with their service names
UPDATE contractors c
SET service_ids = (
  SELECT array_agg(
    CASE 
      -- Check if the current ID is a UUID (has pattern of UUID with hyphens)
      WHEN sid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        -- Look up the service name for this UUID
        COALESCE((SELECT name FROM services WHERE id::text = sid), sid)
      ELSE
        -- It's already a service name, keep it as is
        sid
    END
  ) 
  FROM unnest(c.service_ids) AS sid
  WHERE c.service_ids IS NOT NULL AND array_length(c.service_ids, 1) > 0
)
WHERE c.service_ids IS NOT NULL 
  AND array_length(c.service_ids, 1) > 0
  AND EXISTS (
    SELECT 1 FROM unnest(c.service_ids) AS sid 
    WHERE sid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- Optional: Verify the update worked
SELECT id, name, service_ids FROM contractors WHERE service_ids IS NOT NULL LIMIT 20;

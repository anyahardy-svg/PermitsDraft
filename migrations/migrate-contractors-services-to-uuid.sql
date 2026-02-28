-- Migration: Convert contractors services from TEXT array to service IDs UUID array
-- Purpose: Replace text-based services with proper references to the services table

-- Create new column for service IDs
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS service_ids UUID[] DEFAULT '{}';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_contractors_service_ids ON contractors USING GIN(service_ids);

-- Note: The old 'services' TEXT[] column can be dropped after verification
-- DROP COLUMN services when ready

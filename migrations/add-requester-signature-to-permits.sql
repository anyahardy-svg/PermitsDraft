-- Add requester signature column to permits table
-- This migration adds support for storing requester signatures when submitting permits for approval

ALTER TABLE permits
ADD COLUMN IF NOT EXISTS requester_signature TEXT DEFAULT NULL;

-- Add index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_permits_requester_signature ON permits(id) WHERE requester_signature IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN permits.requester_signature IS 'Base64 encoded signature of the requester when submitting the permit for approval';

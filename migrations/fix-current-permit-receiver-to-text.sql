-- Fix current_permit_receiver_id and last_receiver_id columns to be TEXT instead of UUID
-- This allows storing contractor names just like the "requested_by" field
-- last_receiver_id will store a text log of previous receivers with timestamps

-- Drop the foreign key constraints first
ALTER TABLE permits
DROP CONSTRAINT IF EXISTS permits_current_permit_receiver_id_fkey;

ALTER TABLE permits
DROP CONSTRAINT IF EXISTS permits_last_receiver_id_fkey;

-- Alter the columns to be TEXT
ALTER TABLE permits
ALTER COLUMN current_permit_receiver_id TYPE TEXT;

ALTER TABLE permits
ALTER COLUMN last_receiver_id TYPE TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_permits_current_receiver ON permits(current_permit_receiver_id);
CREATE INDEX IF NOT EXISTS idx_permits_last_receiver ON permits(last_receiver_id);

-- Drop the permit_handovers table - no longer needed, tracking is done in permits table
DROP TABLE IF EXISTS permit_handovers CASCADE;


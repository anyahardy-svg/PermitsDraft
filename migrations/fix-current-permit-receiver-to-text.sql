-- Fix current_permit_receiver_id column to be TEXT instead of UUID with foreign key
-- This allows storing contractor names just like the "requested_by" field

-- Drop the foreign key constraint first
ALTER TABLE permits
DROP CONSTRAINT permits_current_permit_receiver_id_fkey;

-- Alter the column to be TEXT
ALTER TABLE permits
ALTER COLUMN current_permit_receiver_id TYPE TEXT;

-- Add an index for performance
CREATE INDEX idx_permits_current_receiver ON permits(current_permit_receiver_id);

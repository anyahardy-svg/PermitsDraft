-- Fix current_permit_receiver_id and last_receiver_id columns to be TEXT instead of UUID with foreign key
-- This allows storing contractor names just like the "requested_by" field

-- Drop the foreign key constraints first
ALTER TABLE permits
DROP CONSTRAINT IF EXISTS permits_current_permit_receiver_id_fkey,
DROP CONSTRAINT IF EXISTS permits_last_receiver_id_fkey;

-- Alter the columns to be TEXT
ALTER TABLE permits
ALTER COLUMN current_permit_receiver_id TYPE TEXT,
ALTER COLUMN last_receiver_id TYPE TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_permits_current_receiver ON permits(current_permit_receiver_id);
CREATE INDEX IF NOT EXISTS idx_permits_last_receiver ON permits(last_receiver_id);

-- Now fix permit_handovers table: convert from_receiver_id and to_receiver_id to TEXT
ALTER TABLE permit_handovers
DROP CONSTRAINT IF EXISTS permit_handovers_from_receiver_id_fkey,
DROP CONSTRAINT IF EXISTS permit_handovers_to_receiver_id_fkey,
DROP CONSTRAINT IF EXISTS permit_handovers_acknowledged_by_fkey;

ALTER TABLE permit_handovers
ALTER COLUMN from_receiver_id TYPE TEXT,
ALTER COLUMN to_receiver_id TYPE TEXT,
ALTER COLUMN acknowledged_by TYPE TEXT;

-- Add indexes on permit_handovers for performance
CREATE INDEX IF NOT EXISTS idx_permit_handovers_from_receiver ON permit_handovers(from_receiver_id);
CREATE INDEX IF NOT EXISTS idx_permit_handovers_to_receiver ON permit_handovers(to_receiver_id);


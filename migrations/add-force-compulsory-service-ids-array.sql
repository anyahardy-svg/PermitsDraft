-- Migration: Add force_compulsory_with_service_ids array to inductions table
-- Purpose: Support multiple service triggers for force-compulsory induction rules
-- Date: June 9, 2026

ALTER TABLE inductions
ADD COLUMN IF NOT EXISTS force_compulsory_with_service_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN inductions.force_compulsory_with_service_ids IS
  'If set, this induction becomes compulsory when a contractor has any of these services assigned. Services are per business unit.';

-- Backfill from legacy singular column
UPDATE inductions
SET force_compulsory_with_service_ids = ARRAY[force_compulsory_with_service_id]
WHERE force_compulsory_with_service_id IS NOT NULL
  AND (
    force_compulsory_with_service_ids IS NULL
    OR force_compulsory_with_service_ids = '{}'
  );

CREATE INDEX IF NOT EXISTS idx_inductions_force_compulsory_service_ids
  ON inductions USING GIN (force_compulsory_with_service_ids);

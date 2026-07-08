-- Add service_id to training_records for individual training record saves
-- Previously the UI stored the selected service UUID in the notes column.

ALTER TABLE training_records
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_training_records_service_id ON training_records(service_id);

-- Backfill from notes where it contains a service UUID
UPDATE training_records
SET service_id = notes::uuid
WHERE service_id IS NULL
  AND notes IS NOT NULL
  AND notes ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

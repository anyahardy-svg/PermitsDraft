-- Add permit changes log for tracking what was modified
ALTER TABLE permits 
ADD COLUMN IF NOT EXISTS permit_changes_log TEXT DEFAULT NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_permits_changes_log ON permits(permit_changes_log);

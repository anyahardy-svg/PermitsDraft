-- Add last_modified_at timestamp for change tracking
ALTER TABLE permits 
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP DEFAULT NULL;

-- Create index for efficient filtering and sorting by modification time
CREATE INDEX IF NOT EXISTS idx_permits_last_modified_at ON permits(last_modified_at);

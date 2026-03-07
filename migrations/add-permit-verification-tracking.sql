-- Add permit verification tracking fields (if not yet added)
ALTER TABLE permits 
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verified_by TEXT DEFAULT NULL;

-- Create index for efficient filtering of permits needing verification (if not yet created)
CREATE INDEX IF NOT EXISTS idx_permits_last_verified_at ON permits(last_verified_at);

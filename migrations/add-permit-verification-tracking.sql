-- Add permit verification tracking fields
ALTER TABLE permits 
ADD COLUMN last_verified_at TIMESTAMP DEFAULT NULL,
ADD COLUMN verified_by TEXT DEFAULT NULL;

-- Create index for efficient filtering of permits needing verification
CREATE INDEX idx_permits_last_verified_at ON permits(last_verified_at);

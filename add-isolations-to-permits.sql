-- Add isolations column to permits table
ALTER TABLE permits ADD COLUMN IF NOT EXISTS isolations JSONB DEFAULT '[]';

-- Create index for better query performance  
CREATE INDEX IF NOT EXISTS idx_permits_isolations ON permits(isolations);

-- Add service-based filtering to inductions

-- Add service_ids to inductions table (array of UUID service IDs)
ALTER TABLE inductions 
ADD COLUMN IF NOT EXISTS service_ids UUID[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN inductions.service_ids IS 'Array of service IDs that trigger this induction. If empty/null, applies to all services. If populated, only shows for contractors with these services.';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_inductions_service_ids ON inductions USING GIN (service_ids);

-- Migration: Add force_compulsory_with_service_id to inductions table
-- Purpose: Allow inductions to be marked as compulsory when a specific service is selected
-- This allows "Using mobile plant and vehicles on site" to be auto-compulsory when "Mobile Plant Servicing" is selected

-- Add column to link an induction to a service that forces it to be compulsory
ALTER TABLE inductions 
ADD COLUMN IF NOT EXISTS force_compulsory_with_service_id UUID REFERENCES services(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN inductions.force_compulsory_with_service_id IS 'If set, this induction becomes compulsory when a contractor is assigned this service. Used for service-specific safety requirements (e.g., vehicle induction required for Plant Servicing).';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inductions_force_compulsory_service ON inductions(force_compulsory_with_service_id);

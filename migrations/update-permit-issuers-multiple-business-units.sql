-- Migration: Update permit_issuers to support multiple business units
-- Purpose: Change from single business_unit_id to multiple business_unit_ids array to allow permit issuers to be assigned to multiple business units

-- ============================================================================
-- 1. DROP OLD COLUMN AND CREATE NEW ARRAY COLUMN
-- ============================================================================

-- First drop the old index
DROP INDEX IF EXISTS idx_permit_issuers_business_unit_id;

-- Drop the old single business_unit_id column
ALTER TABLE permit_issuers DROP COLUMN IF EXISTS business_unit_id CASCADE;

-- Add the new business_unit_ids array column
ALTER TABLE permit_issuers ADD COLUMN IF NOT EXISTS business_unit_ids UUID[] DEFAULT '{}';

-- Create index for the array column
CREATE INDEX IF NOT EXISTS idx_permit_issuers_business_unit_ids ON permit_issuers USING GIN(business_unit_ids);

-- ============================================================================
-- 2. REMOVE COMPANY COLUMN (replaced by business_unit assignment)
-- ============================================================================

ALTER TABLE permit_issuers DROP COLUMN IF EXISTS company;

-- ============================================================================
-- NOTES
-- ============================================================================
-- permit_issuers now has:
-- - business_unit_ids: UUID[] - array of business units this issuer is assigned to
-- - permitted_service_ids: UUID[] - array of services they can issue permits for
--
-- Permit issuers can now:
-- - Be assigned to multiple business units
-- - Manage services within those business units
-- - Have site access filtered by the sites associated with their assigned business units

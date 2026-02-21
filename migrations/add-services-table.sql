-- Migration: Add services table and link to permit_issuers
-- Purpose: Create a centralized services table linked to business units, and allow permit_issuers to specify which services they can issue permits for

-- ============================================================================
-- 1. CREATE SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_unit_id, name)
);

CREATE INDEX IF NOT EXISTS idx_services_business_unit_id ON services(business_unit_id);

-- ============================================================================
-- 2. ADD PERMITTED SERVICES TO PERMIT_ISSUERS
-- ============================================================================

ALTER TABLE permit_issuers ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;
ALTER TABLE permit_issuers ADD COLUMN IF NOT EXISTS permitted_service_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_permit_issuers_business_unit_id ON permit_issuers(business_unit_id);

-- ============================================================================
-- NOTES
-- ============================================================================
-- Services are now business-unit specific:
-- - WA Amisfield has services (Hot Work, Cold Work, etc.)
-- - Firth has their own services list
-- - Permit issuers linked to a business_unit can only issue for services in that business_unit
-- - permitted_service_ids stores an array of service UUIDs they're authorized to issue
-- - Empty array [] means they can't issue any permits (but can still manage database if isAdmin=true)

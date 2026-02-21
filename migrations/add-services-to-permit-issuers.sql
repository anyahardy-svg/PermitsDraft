-- Migration: Add services support to users (permit issuers)
-- Purpose: Link permit issuers to specific services they can issue permits for
-- Date: February 21, 2026

-- ============================================================================
-- 1. ADD COLUMNS TO USERS TABLE (permit_issuers are stored in users table)
-- ============================================================================

-- Add business_unit_id if not already present (safety check)
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id);

-- Add array column for permitted service IDs
ALTER TABLE users ADD COLUMN IF NOT EXISTS permitted_service_ids UUID[] DEFAULT '{}';

-- Create index for business_unit_id for faster queries
CREATE INDEX IF NOT EXISTS idx_users_business_unit_id ON users(business_unit_id);

-- Create index for the array column
CREATE INDEX IF NOT EXISTS idx_users_service_ids ON users USING GIN (permitted_service_ids);

-- ============================================================================
-- Notes
-- ============================================================================

-- permitted_service_ids is an array of UUIDs that references services.id
-- Empty array {} means "no services" (can manage database only if isAdmin=true)
-- NULL should be treated as empty array in application logic

-- Example: Permit issuer can issue Hot Work, Confined Space, and Electrical permits:
-- UPDATE permit_issuers SET permitted_service_ids = ARRAY[
--   (SELECT id FROM services WHERE name = 'Hot Work' AND business_unit_id = '...'),
--   (SELECT id FROM services WHERE name = 'Confined Space' AND business_unit_id = '...'),
--   (SELECT id FROM services WHERE name = 'Electrical' AND business_unit_id = '...')
-- ] WHERE id = '...';

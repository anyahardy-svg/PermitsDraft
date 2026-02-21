-- Migration: Add kiosk subdomain + phone/visiting person fields
-- Purpose: Enable wildcard subdomain routing + capture visitor/contractor phone + visiting person

-- ============================================================================
-- 1. ADD KIOSK SUBDOMAIN
-- ============================================================================

ALTER TABLE sites ADD COLUMN IF NOT EXISTS kiosk_subdomain TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_sites_kiosk_subdomain ON sites(kiosk_subdomain);

-- ============================================================================
-- 2. UPDATE SIGN_INS TABLE FOR KIOSK REQUIREMENTS
-- ============================================================================

-- Add phone_number (for both contractors and visitors)
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add visiting_person_name (who they're visiting on site)
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS visiting_person_name TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sign_ins_phone_number ON sign_ins(phone_number);

-- ============================================================================
-- NOTES
-- ============================================================================
-- kiosk_subdomain examples: "wa-amisfield-quarry-kiosk"
-- URL will be: {kiosk_subdomain}.contractorhq.co.nz/kiosk

-- sign_ins flow:
-- CONTRACTOR:
--   - Search contractors list by name
--   - Auto-populate: phone_number (from contractors table), contractor_company (via companies lookup)
--   - User enters: visiting_person_name
--   - System sets: check_in_time, contractor_id, site_id, business_unit_id

-- VISITOR:
--   - User enters: visitor_name, visitor_company, phone_number, visiting_person_name
--   - System sets: check_in_time, site_id, business_unit_id
--   - No contractor_id (NULL)

-- SIGN OUT:
--   - List all WHERE check_out_time IS NULL
--   - Select contractor/visitor to sign out
--   - Set check_out_time = NOW(), calculate duration_minutes

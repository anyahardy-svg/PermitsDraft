-- Phase 0.5 Migration: Multi-Business-Unit Support + Kiosk Sign-In System
-- Created: February 20, 2026
-- Purpose: Add business unit architecture and kiosk sign-in/induction tracking

-- ============================================================================
-- 1. CREATE BUSINESS UNITS TABLE (Foundation for multi-tenant)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed with known business units (adjust names/descriptions as needed)
INSERT INTO business_units (name, description) VALUES 
  ('Winstone Aggregates', 'Primary quarry operations'),
  ('Business Unit 2', 'TBD - configure later'),
  ('Business Unit 3', 'TBD - configure later')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. ALTER EXISTING TABLES TO ADD BUSINESS UNIT FKs
-- ============================================================================

-- Add business_unit_id to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id);

-- Add business_unit_id to permit_issuers table
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id);

-- Add business_unit_id to isolation_register
ALTER TABLE isolation_register ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id);

-- ============================================================================
-- 3. REDESIGN SIGN_INS TABLE FOR KIOSK + CONTRACTOR TRACKING
-- ============================================================================

-- Drop and recreate sign_ins with proper structure for both visitor and contractor sign-ins
DROP TABLE IF EXISTS sign_ins CASCADE;

CREATE TABLE sign_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  
  -- Visitor Fields (for third-party visitors, vendors, etc.)
  visitor_name TEXT,
  visitor_company TEXT,
  
  -- Contractor Fields (for inducted contractors)
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  contractor_company TEXT,
  
  -- Sign In/Out Tracking
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,
  
  -- Induction Status (prevents work if not inducted)
  inducted BOOLEAN DEFAULT FALSE,
  induction_status TEXT DEFAULT 'not_inducted', -- 'not_inducted', 'inducted', 'induction_expired'
  inducted_at_site TIMESTAMP WITH TIME ZONE,
  
  -- Auto Sign-Out (16-hour automatic logout)
  auto_signout_at TIMESTAMP WITH TIME ZONE,
  auto_signed_out BOOLEAN DEFAULT FALSE,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_sign_ins_site_id ON sign_ins(site_id);
CREATE INDEX idx_sign_ins_business_unit_id ON sign_ins(business_unit_id);
CREATE INDEX idx_sign_ins_contractor_id ON sign_ins(contractor_id);
CREATE INDEX idx_sign_ins_check_in_time ON sign_ins(check_in_time);
CREATE INDEX idx_sign_ins_signed_in ON sign_ins(check_out_time) WHERE check_out_time IS NULL; -- For "currently signed in" queries

-- ============================================================================
-- 4. CREATE INDUCTION_MODULES TABLE
-- ============================================================================
-- For storing site-specific induction content (YouTube links, docs, etc.)

CREATE TABLE IF NOT EXISTS induction_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT DEFAULT 'html', -- 'html', 'youtube', 'document', 'pdf'
  content TEXT, -- HTML, YouTube embed code, or document URL
  duration_minutes INT DEFAULT 30,
  order_number INT DEFAULT 0,
  
  requires_signature BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_induction_modules_site_id ON induction_modules(site_id);
CREATE INDEX idx_induction_modules_business_unit_id ON induction_modules(business_unit_id);

-- ============================================================================
-- 5. CREATE CONTRACTOR_INDUCTIONS TABLE (Track per-site inductions)
-- ============================================================================
-- Separate from existing contractors table - tracks induction status PER SITE

CREATE TABLE IF NOT EXISTS contractor_inductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  
  inducted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  inducted_by_user_id UUID REFERENCES users(id),
  
  expires_at TIMESTAMP WITH TIME ZONE, -- Usually 1 year from inducted_at
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'expiring_soon', 'expired'
  
  acknowledgment_signature_url TEXT, -- URL to signature image in storage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contractor_inductions_contractor_id ON contractor_inductions(contractor_id);
CREATE INDEX idx_contractor_inductions_site_id ON contractor_inductions(site_id);
CREATE INDEX idx_contractor_inductions_business_unit_id ON contractor_inductions(business_unit_id);
CREATE INDEX idx_contractor_inductions_expires_at ON contractor_inductions(expires_at);

-- ============================================================================
-- 6. ALTER PERMITS TABLE FOR TEMPLATES SUPPORT
-- ============================================================================

ALTER TABLE permits ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE permits ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE permits ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id);

-- Index for finding templates quickly
CREATE INDEX IF NOT EXISTS idx_permits_is_template ON permits(is_template);
CREATE INDEX IF NOT EXISTS idx_permits_business_unit_id ON permits(business_unit_id);

-- ============================================================================
-- 7. ENHANCE AUDIT LOGS FOR COMPLIANCE
-- ============================================================================

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_business_unit_id ON audit_logs(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_site_id ON audit_logs(site_id);

-- ============================================================================
-- 8. CREATE AUTO SIGN-OUT TRIGGER
-- ============================================================================
-- Trigger to automatically set auto_signout_at to 16 hours after check_in

CREATE OR REPLACE FUNCTION set_auto_signout_time()
RETURNS TRIGGER AS $$
BEGIN
  -- If check_out_time is NULL (still signed in), set auto-signout to 16 hours from check_in
  IF NEW.check_out_time IS NULL THEN
    NEW.auto_signout_at := NEW.check_in_time + INTERVAL '16 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sign_ins_auto_signout_trigger ON sign_ins;
CREATE TRIGGER sign_ins_auto_signout_trigger
BEFORE INSERT OR UPDATE ON sign_ins
FOR EACH ROW
EXECUTE FUNCTION set_auto_signout_time();

-- ============================================================================
-- 9. CREATE SCHEDULED JOB FOR AUTO SIGN-OUT
-- ============================================================================
-- This SQL creates a stored procedure that can be run daily to auto-sign-out people

CREATE OR REPLACE FUNCTION auto_signout_inactive_workers()
RETURNS void AS $$
BEGIN
  UPDATE sign_ins
  SET 
    check_out_time = NOW(),
    auto_signed_out = TRUE,
    updated_at = NOW()
  WHERE 
    check_out_time IS NULL
    AND auto_signout_at < NOW()
    AND auto_signed_out = FALSE;
    
  -- Log this action in audit_logs
  INSERT INTO audit_logs (action, details)
  VALUES (
    'auto_signout',
    jsonb_build_object('timestamp', NOW(), 'action', 'Automatic sign-out for inactive workers after 16 hours')
  );
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this function to run daily via Supabase cron or external scheduler
-- Example cron: SELECT cron.schedule('auto-signout-daily', '0 0 * * *', 'SELECT auto_signout_inactive_workers()');

-- ============================================================================
-- 10. PRESERVE PERMIT_ISSUER_SITE_ID (No changes needed)
-- ============================================================================
-- This junction table maps permit_issuers to sites (many-to-many)
-- Structure: id, permit_issuer_id, site_id, created_at
-- No schema changes needed - it's working correctly as-is

-- ============================================================================
-- 11. ENABLE RLS (Row Level Security) FOR NEW/ALTERED TABLES
-- ============================================================================

ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE induction_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_inductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (temporary - allow all for now, tighten later in Phase 1 auth)
CREATE POLICY "Allow all access to business_units" ON business_units FOR ALL USING (true);
CREATE POLICY "Allow all access to induction_modules" ON induction_modules FOR ALL USING (true);
CREATE POLICY "Allow all access to contractor_inductions" ON contractor_inductions FOR ALL USING (true);

-- ============================================================================
-- 12. VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify migration completed successfully:
/*
-- Check business units created
SELECT * FROM business_units;

-- Check sites now have business_unit_id
SELECT id, name, business_unit_id FROM sites LIMIT 5;

-- Check sign_ins table structure
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sign_ins';

-- Check induction_modules exist
SELECT * FROM induction_modules LIMIT 5;

-- Check auto_signout trigger is active
SELECT * FROM pg_triggers WHERE tgname = 'sign_ins_auto_signout_trigger';
*/

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
/*
CHANGES IN THIS MIGRATION:

1. BUSINESS UNITS TABLE
   - New table to support 3 business units (Winstone Aggregates + 2 TBD)
   - Foundation for multi-tenant architecture

2. SIGN_INS TABLE (COMPLETE REDESIGN)
   OLD: visitor_name, company, check_in_time, check_out_time, site_id
   NEW:
   ✓ Separate visitor vs contractor tracking (both with company)
   ✓ Added business_unit_id (for faster queries)
   ✓ Added contractor_id FK (link to contractors table)
   ✓ Added inducted flag (prevents work if not inducted)
   ✓ Added induction_status (not_inducted/inducted/expired)
   ✓ Added inducted_at_site (track when inducted for THIS site)
   ✓ Added auto_signout_at (16-hour auto-logout)
   ✓ Added auto_signed_out flag (track if auto-logout happened)

3. INDUCTION_MODULES TABLE
   - Site-specific induction content
   - Supports HTML, YouTube embeds, documents, PDFs
   - Has order_number for module sequence
   - Links to sites and business_units

4. CONTRACTOR_INDUCTIONS TABLE
   - Tracks PER-SITE induction completion (separate from contractors.induction_expiry)
   - Allows different expiry dates per site
   - Stores signature acknowledgment

5. PERMITS TABLE UPDATES
   - Added is_template flag (save permits as templates)
   - Added template_name (user-friendly template name)
   - Added business_unit_id (for template scoping per business unit)

6. AUTO SIGN-OUT TRIGGER
   - Automatically sets auto_signout_at to 16 hours after check_in
   - Trigger: auto_signout_inactive_workers() can be run daily to mark as signed out

7. PERMIT_ISSUER_SITE_ID
   - NOT ALTERED - it's a valid junction table
   - Maps permit_issuers to sites (many-to-many relationship)
   - Working correctly as-is, no changes needed

8. AUDIT LOGS
   - Added business_unit_id and site_id for better filtering
   - Can now track which business unit/site each action affects

NEXT STEPS (Phase 0.5 continued):
1. Execute this migration in Supabase SQL Editor
2. Create API functions for:
   - src/api/signIns.js (check in, check out, list active)
   - src/api/inductions.js (start induction, complete, get status)
   - src/api/templates.js (save template, list templates, copy to new permit)
3. Build Kiosk UI Screen (PermitToWorkScreen.js)
4. Add business unit selector to admin panels

TEMPLATE FEATURE IMPLEMENTATION:
- User saves a completed permit as template
  → Sets is_template = TRUE, template_name = "Template Name"
  → Stores in permits table
- User clicks "Create from Template" in new permit form
  → Copies permit data (type, questions, controls, hazards)
  → Pre-fills new permit form
  → User can edit before final approval

BACKLOG (Future improvements):
- Biometric integration for sign-in (fingerprint)
- Geofencing alerts (contractor leaves site)
- SMS notifications for pending inductions
- Integration with payroll system (export sign-in hours)
*/

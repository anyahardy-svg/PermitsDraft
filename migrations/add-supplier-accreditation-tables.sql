-- Migration: Add Supplier Accreditation Tables
-- Purpose: Isolated supplier identity and dynamic accreditation questionnaire storage
-- Date: June 7, 2026
--
-- NOTE: This platform is intentionally separate from the contractors/companies tables.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- HELPER: Admin role check for RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION is_supplier_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'supplier_admin'),
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'supplier_admin'),
    false
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TABLE 1: suppliers (Core Identity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  risk_classification TEXT CHECK (
    risk_classification IS NULL
    OR risk_classification IN ('Critical', 'High', 'Medium', 'Low')
  ),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company_name
  ON suppliers (company_name);

CREATE INDEX IF NOT EXISTS idx_suppliers_status
  ON suppliers (status);

CREATE INDEX IF NOT EXISTS idx_suppliers_risk_classification
  ON suppliers (risk_classification);

-- ============================================================================
-- TABLE 2: supplier_accreditations (Dynamic Questionnaire Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_accreditations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'reviewing', 'approved', 'rejected')
  ),
  accreditation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_accreditations_supplier_id
  ON supplier_accreditations (supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_accreditations_submitted_by
  ON supplier_accreditations (submitted_by);

CREATE INDEX IF NOT EXISTS idx_supplier_accreditations_status
  ON supplier_accreditations (status);

CREATE INDEX IF NOT EXISTS idx_supplier_accreditations_accreditation_data
  ON supplier_accreditations USING gin (accreditation_data);

-- ============================================================================
-- TRIGGER: Auto-update updated_at on supplier_accreditations
-- ============================================================================

CREATE OR REPLACE FUNCTION update_supplier_accreditations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS supplier_accreditations_update_timestamp ON supplier_accreditations;

CREATE TRIGGER supplier_accreditations_update_timestamp
  BEFORE UPDATE ON supplier_accreditations
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_accreditations_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY: suppliers
-- ============================================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_accreditation_suppliers_select ON suppliers;
DROP POLICY IF EXISTS supplier_accreditation_suppliers_insert ON suppliers;
DROP POLICY IF EXISTS supplier_accreditation_suppliers_update ON suppliers;

-- Admins can read all suppliers. Other authenticated users can read active
-- suppliers (onboarding) or suppliers they already have accreditations for.
CREATE POLICY supplier_accreditation_suppliers_select
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (
    is_supplier_admin()
    OR status = 'active'
    OR EXISTS (
      SELECT 1
      FROM supplier_accreditations sa
      WHERE sa.supplier_id = suppliers.id
        AND sa.submitted_by = auth.uid()
    )
  );

-- Only supplier platform admins can create supplier records.
CREATE POLICY supplier_accreditation_suppliers_insert
  ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (is_supplier_admin());

-- Only supplier platform admins can update supplier records.
CREATE POLICY supplier_accreditation_suppliers_update
  ON suppliers
  FOR UPDATE
  TO authenticated
  USING (is_supplier_admin())
  WITH CHECK (is_supplier_admin());

-- ============================================================================
-- ROW LEVEL SECURITY: supplier_accreditations
-- ============================================================================

ALTER TABLE supplier_accreditations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_accreditations_select_own_or_admin ON supplier_accreditations;
DROP POLICY IF EXISTS supplier_accreditations_insert_own_or_admin ON supplier_accreditations;
DROP POLICY IF EXISTS supplier_accreditations_update_own_or_admin ON supplier_accreditations;

-- Users can view their own submissions; admins can view all.
CREATE POLICY supplier_accreditations_select_own_or_admin
  ON supplier_accreditations
  FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR is_supplier_admin()
  );

-- Users can create accreditations for themselves; admins can create on behalf of others.
CREATE POLICY supplier_accreditations_insert_own_or_admin
  ON supplier_accreditations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    OR is_supplier_admin()
  );

-- Users can update their own draft/rejected submissions; admins can update any record.
CREATE POLICY supplier_accreditations_update_own_or_admin
  ON supplier_accreditations
  FOR UPDATE
  TO authenticated
  USING (
    is_supplier_admin()
    OR (
      submitted_by = auth.uid()
      AND status IN ('draft', 'rejected')
    )
  )
  WITH CHECK (
    is_supplier_admin()
    OR (
      submitted_by = auth.uid()
      AND status IN ('draft', 'reviewing', 'rejected')
    )
  );

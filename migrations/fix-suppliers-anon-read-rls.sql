-- Migration: Allow admin panel (anon key) to read suppliers
-- Purpose: The admin panel uses custom admin_users auth with the Supabase anon key,
--          not Supabase JWT auth. The original suppliers RLS only allowed the
--          authenticated role, so list queries returned zero rows.
-- Date: June 7, 2026

-- Allow anon/public read on suppliers (matches companies + admin_users pattern)
DROP POLICY IF EXISTS supplier_accreditation_suppliers_select_anon ON suppliers;

CREATE POLICY supplier_accreditation_suppliers_select_anon
  ON suppliers
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon/public read on supplier_accreditations for admin list/form views
DROP POLICY IF EXISTS supplier_accreditations_select_anon ON supplier_accreditations;

CREATE POLICY supplier_accreditations_select_anon
  ON supplier_accreditations
  FOR SELECT
  TO anon
  USING (true);

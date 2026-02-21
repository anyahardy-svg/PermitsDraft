-- Migration: Add contractor_name to sign_ins table
-- Purpose: Store contractor name directly in sign_ins for display in Supabase without joining to contractors table

ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS contractor_name TEXT;

CREATE INDEX IF NOT EXISTS idx_sign_ins_contractor_name ON sign_ins(contractor_name);

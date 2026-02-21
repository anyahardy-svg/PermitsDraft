-- Migration: Add contractor_name and contractor_phone to sign_ins table
-- Purpose: Store contractor name and phone directly in sign_ins for display in Supabase without joining to contractors table

ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS contractor_name TEXT;
ALTER TABLE sign_ins ADD COLUMN IF NOT EXISTS contractor_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_sign_ins_contractor_name ON sign_ins(contractor_name);
CREATE INDEX IF NOT EXISTS idx_sign_ins_contractor_phone ON sign_ins(contractor_phone);

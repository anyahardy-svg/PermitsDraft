-- Migration: Allow supplier form submissions without an auth user
-- Purpose: Suppliers complete the questionnaire via token links without Supabase login.
--          Form data is stored per supplier; submitted_by is optional metadata.
-- Date: June 15, 2026

ALTER TABLE supplier_accreditations
  ALTER COLUMN submitted_by DROP NOT NULL;

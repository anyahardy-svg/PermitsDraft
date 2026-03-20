-- Migration: Add Training Records Status Fields to Companies Table
-- Purpose: Track training records approval workflow and status
-- Date: March 20, 2026

-- ============================================================================
-- Training Records Status Management
-- ============================================================================

-- Overall status of company's training records:
-- 'none' = no records uploaded yet
-- 'added' = records uploaded but not yet reviewed/approved
-- 'approved' = all records have been approved
-- 'needs_review' = new/updated records added after previous approval
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_status TEXT DEFAULT 'none';

-- Timestamp when training records were first submitted
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_submitted_at TIMESTAMP WITH TIME ZONE;

-- Timestamp when training records were last approved
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_approved_at TIMESTAMP WITH TIME ZONE;

-- Timestamp when training records were last modified (new/updated records added)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_last_modified_at TIMESTAMP WITH TIME ZONE;

-- Admin who approved the training records
ALTER TABLE companies ADD COLUMN IF NOT EXISTS training_records_approved_by TEXT;

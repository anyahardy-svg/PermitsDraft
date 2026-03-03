-- Migration: Add signature field to contractors table
-- Purpose: Store actual signatures captured during induction completion
-- Date: March 3, 2026

ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS signature TEXT; -- Base64 or URL-based signature image

-- Create index for signature lookups (contractors with signatures)
CREATE INDEX IF NOT EXISTS idx_contractors_signature ON contractors(CASE WHEN signature IS NOT NULL THEN id END);

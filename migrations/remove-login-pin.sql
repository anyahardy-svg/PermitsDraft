-- Migration: Remove login_pin column from contractors table
-- Purpose: PIN-based authentication replaced with email/password OTP flow
-- Date: April 1, 2026

-- Drop the login_pin column and related index
ALTER TABLE contractors DROP COLUMN IF EXISTS login_pin;
ALTER TABLE contractors DROP COLUMN IF EXISTS pin_last_updated;

-- Verify the removal
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'contractors' AND column_name LIKE '%pin%';

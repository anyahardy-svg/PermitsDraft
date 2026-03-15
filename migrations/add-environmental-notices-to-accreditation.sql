-- Add environmental_notices field to companies table for Section 20
-- Stores yes/no answer about environmental enforcement notices

ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_notices TEXT DEFAULT 'no';

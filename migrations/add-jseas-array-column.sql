-- Migration: Add jseas array column for multi-JSEA support
-- Date: 2024
-- This migration adds support for multiple JSEAs per permit while maintaining backward compatibility

-- Add jseas column as JSONB array
ALTER TABLE permits ADD COLUMN IF NOT EXISTS jseas JSONB DEFAULT '[]';

-- Populate jseas with existing jsea data for backward compatibility
-- If a permit has a jsea with taskSteps, convert it to the jseas array
UPDATE permits 
SET jseas = CASE 
  WHEN jsea::text != '{}' AND jsea::text != '' THEN 
    jsonb_build_array(jsea)::jsonb
  ELSE '[]'::jsonb
END
WHERE jsea IS NOT NULL;

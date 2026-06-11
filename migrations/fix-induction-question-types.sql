-- Migration: Fix induction question types and answers storage
-- Purpose: Add question_X_type columns and change question_X_correct_answer to JSONB
-- Date: April 2, 2026

-- Add question type columns (single-select, multi-select)
ALTER TABLE inductions
ADD COLUMN IF NOT EXISTS question_1_type TEXT DEFAULT 'single-select',
ADD COLUMN IF NOT EXISTS question_2_type TEXT DEFAULT 'single-select',
ADD COLUMN IF NOT EXISTS question_3_type TEXT DEFAULT 'single-select';

-- Drop the old INT constraints and recreate as JSONB to support both single values and arrays
ALTER TABLE inductions
DROP COLUMN IF EXISTS question_1_correct_answer,
DROP COLUMN IF EXISTS question_2_correct_answer,
DROP COLUMN IF EXISTS question_3_correct_answer;

ALTER TABLE inductions
ADD COLUMN IF NOT EXISTS question_1_correct_answer JSONB, -- Can store int or int[]
ADD COLUMN IF NOT EXISTS question_2_correct_answer JSONB,
ADD COLUMN IF NOT EXISTS question_3_correct_answer JSONB;

-- Add service_id column if missing (referenced in code but not in schema)
ALTER TABLE inductions
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE CASCADE;

-- Add force_compulsory_with_service_id column if missing
ALTER TABLE inductions
ADD COLUMN IF NOT EXISTS force_compulsory_with_service_id UUID;

-- Add force_compulsory_with_service_ids array for multiple service triggers
ALTER TABLE inductions
ADD COLUMN IF NOT EXISTS force_compulsory_with_service_ids UUID[] DEFAULT '{}';

UPDATE inductions
SET force_compulsory_with_service_ids = ARRAY[force_compulsory_with_service_id]
WHERE force_compulsory_with_service_id IS NOT NULL
  AND (
    force_compulsory_with_service_ids IS NULL
    OR force_compulsory_with_service_ids = '{}'
  );

CREATE INDEX IF NOT EXISTS idx_inductions_force_compulsory_service_ids
  ON inductions USING GIN (force_compulsory_with_service_ids);

-- Update index on services
CREATE INDEX IF NOT EXISTS idx_inductions_service ON inductions(service_id);

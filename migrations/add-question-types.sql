-- Add question type columns to inductions table
-- Allows questions to be configured as single-select (radio buttons) or multi-select (checkboxes)
-- Default: 'single-select' for backwards compatibility

ALTER TABLE inductions ADD COLUMN IF NOT EXISTS question_1_type TEXT DEFAULT 'single-select';
ALTER TABLE inductions ADD COLUMN IF NOT EXISTS question_2_type TEXT DEFAULT 'single-select';
ALTER TABLE inductions ADD COLUMN IF NOT EXISTS question_3_type TEXT DEFAULT 'single-select';

-- Add comment for clarity
COMMENT ON COLUMN inductions.question_1_type IS 'Question type: "single-select" for radio buttons or "multi-select" for checkboxes';
COMMENT ON COLUMN inductions.question_2_type IS 'Question type: "single-select" for radio buttons or "multi-select" for checkboxes';
COMMENT ON COLUMN inductions.question_3_type IS 'Question type: "single-select" for radio buttons or "multi-select" for checkboxes';

-- Add rejection_comment column to permits table
-- This column stores feedback from reviewers when they send a permit back to draft

ALTER TABLE permits ADD COLUMN rejection_comment TEXT DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_permits_rejection_comment ON permits(rejection_comment) WHERE rejection_comment IS NOT NULL;

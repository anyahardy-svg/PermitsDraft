-- Migration: Fix accreditation_status values backfilled by DEFAULT 'in-progress'
-- Purpose: Correct status for companies that never started, were invited only, or were already accredited
-- Date: June 12, 2026

-- Previously accredited companies should show as approved
UPDATE companies
SET accreditation_status = 'approved'
WHERE accredited_date IS NOT NULL
  AND accreditation_status IN ('in-progress', 'started', 'none');

-- Companies actively working on accreditation
UPDATE companies
SET accreditation_status = 'in-progress'
WHERE accredited_date IS NULL
  AND accreditation_last_updated IS NOT NULL
  AND accreditation_status IN ('none', 'started');

-- Invited companies that have not opened the form yet
UPDATE companies
SET accreditation_status = 'started'
WHERE accredited_date IS NULL
  AND accreditation_invitation_sent_at IS NOT NULL
  AND accreditation_last_updated IS NULL
  AND accreditation_status = 'in-progress';

-- Companies that have never been invited and have not touched accreditation
UPDATE companies
SET accreditation_status = 'none'
WHERE accredited_date IS NULL
  AND accreditation_invitation_sent_at IS NULL
  AND accreditation_last_updated IS NULL
  AND accreditation_status = 'in-progress';

-- New companies should not default to in-progress
ALTER TABLE companies ALTER COLUMN accreditation_status SET DEFAULT 'none';

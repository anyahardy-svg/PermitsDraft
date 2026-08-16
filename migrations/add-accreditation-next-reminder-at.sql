-- Per-company reminder scheduling (replaces weekday position batching)
-- The cron job sends reminders when accreditation_next_reminder_at <= now()

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS accreditation_next_reminder_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_accreditation_next_reminder_at
  ON companies (accreditation_next_reminder_at)
  WHERE accreditation_next_reminder_at IS NOT NULL;

-- Backfill: first reminder 7 days after the original invitation was sent
UPDATE companies
SET accreditation_next_reminder_at = accreditation_invitation_sent_at + interval '7 days'
WHERE accreditation_invitation_sent_at IS NOT NULL
  AND accreditation_last_updated IS NULL
  AND accredited_date IS NULL
  AND accreditation_status IN ('none', 'started')
  AND (company_active IS NULL OR company_active = true)
  AND accreditation_next_reminder_at IS NULL;

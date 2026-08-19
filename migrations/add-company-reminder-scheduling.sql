-- Per-company monthly reminder scheduling with shared daily email cap
-- Supports accreditation reminders now and induction reminders later

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS accreditation_next_reminder_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_accreditation_next_reminder_at
  ON companies (accreditation_next_reminder_at)
  WHERE accreditation_next_reminder_at IS NOT NULL;

-- Backfill: schedule first/next reminder 30 days after last reminder or invitation
UPDATE companies
SET accreditation_next_reminder_at = COALESCE(
  accreditation_invitation_reminder_sent_at + interval '30 days',
  accreditation_invitation_sent_at + interval '30 days'
)
WHERE accreditation_invitation_sent_at IS NOT NULL
  AND accreditation_last_updated IS NULL
  AND accredited_date IS NULL
  AND accreditation_status IN ('none', 'started')
  AND (company_active IS NULL OR company_active = true)
  AND accreditation_next_reminder_at IS NULL;

CREATE TABLE IF NOT EXISTS reminder_cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dry_run BOOLEAN NOT NULL DEFAULT false,
  daily_cap INT NOT NULL,
  already_sent_today INT NOT NULL DEFAULT 0,
  remaining_quota INT NOT NULL DEFAULT 0,
  run_skipped BOOLEAN NOT NULL DEFAULT false,
  skip_reason TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reminder_cron_runs_run_at
  ON reminder_cron_runs (run_at DESC);

ALTER TABLE reminder_cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to reminder_cron_runs"
  ON reminder_cron_runs FOR ALL USING (true);

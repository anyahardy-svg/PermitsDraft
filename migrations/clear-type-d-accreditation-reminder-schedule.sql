-- Type D (low risk) companies do not receive accreditation invitation reminder emails.
-- Clear any scheduled reminder dates for existing Type D companies.

UPDATE companies
SET accreditation_next_reminder_at = NULL
WHERE contractor_type = 'D'
  AND accreditation_next_reminder_at IS NOT NULL;

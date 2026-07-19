-- Accreditation invitation reminder tracking
-- Supports scheduled re-sends to companies invited but not yet started accreditation

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS accreditation_invitation_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accreditation_invitation_reminder_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_companies_accreditation_invitation_reminder_sent_at
  ON companies (accreditation_invitation_reminder_sent_at);

CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_email_type_sent_at
  ON email_send_log (email_type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_send_log_company_id
  ON email_send_log (company_id);

ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to email_send_log"
  ON email_send_log FOR ALL USING (true);

INSERT INTO email_templates (type, name, subject, html_content, description, variables, is_active)
VALUES (
  'invitation-reminder',
  'Accreditation Invitation Reminder',
  'Reminder: {{companyName}} - Complete Your Company Accreditation',
  '<h2>Reminder: Complete Your Company Accreditation</h2>
<p>Dear {{contactName}},</p>
<p>We previously invited {{companyName}} to complete an accreditation questionnaire, but we have not yet received your submission.</p>
<p><strong>Deadline:</strong> {{deadline}}</p>
<p>To get started, please create a password and access our portal:</p>
<p><a href="{{signupUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Complete Your Accreditation</a></p>
<p style="margin-top: 16px; padding: 12px; background-color: #F0F9FF; border-left: 3px solid #3B82F6; font-size: 13px;">
  <strong>Already have an account?</strong> If you have already registered, please log in or use the "Forgot Password" option on the sign-in page.
</p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>',
  'Sent automatically to companies that were invited but have not started accreditation',
  '["companyName", "contactName", "deadline", "signupUrl", "supportEmail"]'::jsonb,
  true
)
ON CONFLICT (type) DO NOTHING;

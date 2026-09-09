-- Accreditation approval chain: manager -> H&S -> company notification

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS assigned_manager_id UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS assigned_hs_person_id UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS manager_approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS hs_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hs_approved_by UUID REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS hs_approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS accreditation_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_assigned_manager_id ON companies(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_companies_assigned_hs_person_id ON companies(assigned_hs_person_id);
CREATE INDEX IF NOT EXISTS idx_companies_accreditation_status_pending ON companies(accreditation_status)
  WHERE accreditation_status IN ('pending_manager', 'pending_hs');

CREATE TABLE IF NOT EXISTS accreditation_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('manager', 'hs')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accreditation_approval_tokens_token ON accreditation_approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_accreditation_approval_tokens_company_stage ON accreditation_approval_tokens(company_id, stage);

ALTER TABLE accreditation_approval_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to accreditation_approval_tokens" ON accreditation_approval_tokens FOR ALL USING (true);

INSERT INTO email_templates (type, name, subject, html_content, description, variables, is_active)
VALUES
(
  'accreditation-manager-approval',
  'Accreditation Manager Approval Request',
  '{{companyName}} - Accreditation awaiting your approval',
  '<h2>Accreditation Approval Required</h2>
<p>Hello {{approverName}},</p>
<p><strong>{{companyName}}</strong> has submitted their accreditation questionnaire and is awaiting your approval as the assigned manager.</p>
<p>Please review the submission and approve or request changes using the secure links below:</p>
<p><a href="{{approvalUrl}}" style="background-color: #10B981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; margin-right: 8px;">Review &amp; Approve</a></p>
<p style="margin-top: 16px; font-size: 13px; color: #6B7280;">If the button does not work, copy this link: {{approvalUrl}}</p>
<p>If you have any questions, contact us at {{supportEmail}}</p>',
  'Sent to the assigned manager when a company submits accreditation for approval',
  '["companyName", "approverName", "approvalUrl", "supportEmail"]'::jsonb,
  true
),
(
  'accreditation-hs-approval',
  'Accreditation H&S Approval Request',
  '{{companyName}} - H&amp;S accreditation approval required',
  '<h2>H&amp;S Accreditation Approval Required</h2>
<p>Hello {{approverName}},</p>
<p><strong>{{companyName}}</strong> has been approved by their assigned manager and now requires your H&amp;S approval.</p>
<p>Please review the submission and approve or request changes using the secure link below:</p>
<p><a href="{{approvalUrl}}" style="background-color: #10B981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Review &amp; Approve</a></p>
<p style="margin-top: 16px; font-size: 13px; color: #6B7280;">If the button does not work, copy this link: {{approvalUrl}}</p>
<p>If you have any questions, contact us at {{supportEmail}}</p>',
  'Sent to the assigned H&S person after manager approval',
  '["companyName", "approverName", "approvalUrl", "supportEmail"]'::jsonb,
  true
),
(
  'accreditation-approved',
  'Accreditation Approved',
  '{{companyName}} - Your accreditation has been approved',
  '<h2>Accreditation Approved</h2>
<p>Dear {{contactName}},</p>
<p>We are pleased to confirm that <strong>{{companyName}}</strong> has been fully accredited.</p>
<p><strong>Accredited date:</strong> {{accreditedDate}}</p>
<p>You can log in to Contractor Hub to view your accreditation status:</p>
<p><a href="{{loginUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>',
  'Sent to the company contact when accreditation is fully approved',
  '["companyName", "contactName", "accreditedDate", "loginUrl", "supportEmail"]'::jsonb,
  true
),
(
  'accreditation-revision-requested',
  'Accreditation Revision Requested',
  '{{companyName}} - Accreditation changes requested',
  '<h2>Accreditation Changes Requested</h2>
<p>Dear {{contactName}},</p>
<p>Your accreditation submission for <strong>{{companyName}}</strong> requires changes before it can be approved.</p>
<p><strong>Feedback:</strong></p>
<p style="padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B;">{{feedback}}</p>
<p>Please log in to Contractor Hub, update your accreditation, and submit again:</p>
<p><a href="{{loginUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>',
  'Sent to the company contact when an approver requests revision',
  '["companyName", "contactName", "feedback", "loginUrl", "supportEmail"]'::jsonb,
  true
)
ON CONFLICT (type) DO NOTHING;

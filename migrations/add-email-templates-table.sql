-- Add Email Templates Table
-- Allows admins to draft and manage email templates without code changes

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Create index for quick lookups
CREATE INDEX idx_email_templates_type ON email_templates(type);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to email templates" ON email_templates FOR ALL USING (true);

-- Insert default templates
INSERT INTO email_templates (type, name, subject, html_content, description, variables, is_active) VALUES
(
  'invitation',
  'Accreditation Invitation',
  '{{companyName}} - Complete Your Company Accreditation',
  '<h2>Complete Your Company Accreditation</h2>
<p>Hello,</p>
<p>{{companyName}} is requesting that you complete an accreditation questionnaire.</p>
<p><strong>Deadline:</strong> {{deadline}}</p>
<p>To get started, you''ll need to create a password and access our portal:</p>
<p><a href="{{signupUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Create Your Password</a></p>
<p style="margin-top: 16px; padding: 12px; background-color: #F0F9FF; border-left: 3px solid #3B82F6; font-size: 13px;">
  <strong>Already have an account?</strong> If you''ve already registered before, please use the "Forgot Password" option to reset your password instead of creating a new account.
</p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>',
  'Sent when inviting contractors to complete accreditation',
  '["companyName", "deadline", "signupUrl", "supportEmail"]'::jsonb,
  true
),
(
  'admin-setup',
  'Admin Setup Email',
  'Welcome {{adminName}} - Set Your Admin Password',
  '<h2>Welcome to Contractor HQ Admin</h2>
<p>Hello {{adminName}},</p>
<p>Your admin account has been created. Please set your password to get started:</p>
<p><a href="{{setupUrl}}" style="background-color: #10B981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Set Password</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you have any questions, contact support at {{supportEmail}}</p>',
  'Sent to new admin users to set up their password',
  '["adminName", "setupUrl", "supportEmail"]'::jsonb,
  true
),
(
  'admin-password-reset',
  'Admin Password Reset',
  'Reset Your Admin Password',
  '<h2>Password Reset Request</h2>
<p>Hello {{adminName}},</p>
<p>A password reset has been requested for your admin account.</p>
<p><a href="{{resetUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset Password</a></p>
<p>This link will expire in 1 hour. If you didn''t request this, please ignore this email.</p>
<p>If you have any questions, please contact support at {{supportEmail}}</p>',
  'Sent when admin requests a password reset',
  '["adminName", "resetUrl", "supportEmail"]'::jsonb,
  true
);

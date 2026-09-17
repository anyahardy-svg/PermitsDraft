-- Add induction status to the sign-in notification email template.

UPDATE email_templates
SET
  html_content = '<h2>Site Sign-In Notification</h2>
<p>Hello {{recipientName}},</p>
<p>A {{personType}} has signed in at <strong>{{siteName}}</strong>.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Name</td><td style="padding: 6px 0;">{{personName}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Company</td><td style="padding: 6px 0;">{{personCompany}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Phone</td><td style="padding: 6px 0;">{{personPhone}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Induction status</td><td style="padding: 6px 0;">{{inductionStatus}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Check-in time</td><td style="padding: 6px 0;">{{checkInTime}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Visiting</td><td style="padding: 6px 0;">{{visitingPersonName}}</td></tr>
</table>
<p style="color: #6B7280; font-size: 13px;">This notification was sent because you are listed as the contact for this sign-in.</p>',
  variables = '["recipientName", "siteName", "personType", "personName", "personCompany", "personPhone", "inductionStatus", "checkInTime", "visitingPersonName"]'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'sign-in-notification';

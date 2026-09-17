-- Seed the sign-in notification email template if it does not already exist.

INSERT INTO email_templates (type, name, subject, html_content, description, variables, is_active)
SELECT
  'sign-in-notification',
  'Site Sign-In Notification',
  '{{siteName}} - {{personType}} sign-in: {{personName}}',
  '<h2>Site Sign-In Notification</h2>
<p>Hello {{recipientName}},</p>
<p>A {{personType}} has signed in at <strong>{{siteName}}</strong>.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Name</td><td style="padding: 6px 0;">{{personName}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Company</td><td style="padding: 6px 0;">{{personCompany}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Phone</td><td style="padding: 6px 0;">{{personPhone}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Check-in time</td><td style="padding: 6px 0;">{{checkInTime}}</td></tr>
  <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Visiting</td><td style="padding: 6px 0;">{{visitingPersonName}}</td></tr>
</table>
<p style="color: #6B7280; font-size: 13px;">This notification was sent because you are listed as the contact for this sign-in.</p>',
  'Sent when a visitor or contractor signs in at a site kiosk',
  ARRAY['recipientName', 'siteName', 'personType', 'personName', 'personCompany', 'personPhone', 'checkInTime', 'visitingPersonName'],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE type = 'sign-in-notification'
);

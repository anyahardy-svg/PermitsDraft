-- Add supplier invitation email template
-- Sent when inviting suppliers to complete their accreditation form via a secure token link

INSERT INTO email_templates (type, name, subject, html_content, description, variables, is_active)
VALUES (
  'supplier-invitation',
  'Supplier Accreditation Invitation',
  '{{companyName}} - Complete Your Supplier Accreditation',
  '<h2>Supplier Accreditation Invitation</h2>
<p>Dear {{contactName}},</p>
<p>{{companyName}} has been invited to complete a supplier accreditation questionnaire.</p>
<p><strong>Submit form deadline:</strong> {{deadline}}</p>
<p>Please use the secure link below to open your supplier accreditation form:</p>
<p><a href="{{formUrl}}" style="background-color: #0284C7; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Complete Supplier Accreditation</a></p>
<p style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; font-size: 13px;">
  <strong>Security Note:</strong> This link is personal to your organisation. Do not share it with anyone else.
</p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>',
  'Sent when inviting suppliers to complete their accreditation form',
  '["companyName", "contactName", "deadline", "formUrl", "supportEmail"]'::jsonb,
  true
)
ON CONFLICT (type) DO NOTHING;

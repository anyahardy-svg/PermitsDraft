export const SUPPLIER_INVITATION_EMAIL_TEMPLATE = {
  type: 'supplier-invitation',
  name: 'Supplier Accreditation Invitation',
  subject: '{{companyName}} - Complete Your Supplier Accreditation',
  html_content: `<h2>Supplier Accreditation Invitation</h2>
<p>Dear {{contactName}},</p>
<p>{{companyName}} has been invited to complete a supplier accreditation questionnaire.</p>
<p><strong>Submit form deadline:</strong> {{deadline}}</p>
<p>Please use the secure link below to open your supplier accreditation form:</p>
<p><a href="{{formUrl}}" style="background-color: #0284C7; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Complete Supplier Accreditation</a></p>
<p>If the button doesn't work, copy and paste this link into your browser:</p>
<p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #F3F4F6; padding: 12px; border-radius: 4px;">{{formUrl}}</p>
<p style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; font-size: 13px;">
  <strong>Security Note:</strong> This link is personal to your organisation. Do not share it with anyone else.
</p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>`,
  description: 'Sent when inviting suppliers to complete their accreditation form',
  variables: ['companyName', 'contactName', 'deadline', 'formUrl', 'supportEmail'],
  is_active: true,
};

export const DEFAULT_EMAIL_TEMPLATES = [
  SUPPLIER_INVITATION_EMAIL_TEMPLATE,
];

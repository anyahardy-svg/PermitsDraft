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

export const ACCREDITATION_MANAGER_APPROVAL_TEMPLATE = {
  type: 'accreditation-manager-approval',
  name: 'Accreditation Manager Approval Request',
  subject: '{{companyName}} - Accreditation awaiting your approval',
  html_content: `<h2>Accreditation Approval Required</h2>
<p>Hello {{approverName}},</p>
<p><strong>{{companyName}}</strong> has submitted their accreditation questionnaire and is awaiting your approval as the assigned manager.</p>
<p><a href="{{approvalUrl}}" style="background-color: #10B981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Review &amp; Approve</a></p>
<p>If you have any questions, contact us at {{supportEmail}}</p>`,
  description: 'Sent to the assigned manager when a company submits accreditation for approval',
  variables: ['companyName', 'approverName', 'approvalUrl', 'supportEmail'],
  is_active: true,
};

export const ACCREDITATION_HS_APPROVAL_TEMPLATE = {
  type: 'accreditation-hs-approval',
  name: 'Accreditation H&S Approval Request',
  subject: '{{companyName}} - H&S accreditation approval required',
  html_content: `<h2>H&amp;S Accreditation Approval Required</h2>
<p>Hello {{approverName}},</p>
<p><strong>{{companyName}}</strong> requires your H&amp;S approval.</p>
<p><a href="{{approvalUrl}}" style="background-color: #10B981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Review &amp; Approve</a></p>
<p>If you have any questions, contact us at {{supportEmail}}</p>`,
  description: 'Sent to the assigned H&S person after manager approval',
  variables: ['companyName', 'approverName', 'approvalUrl', 'supportEmail'],
  is_active: true,
};

export const ACCREDITATION_APPROVED_TEMPLATE = {
  type: 'accreditation-approved',
  name: 'Accreditation Approved',
  subject: '{{companyName}} - Your accreditation has been approved',
  html_content: `<h2>Accreditation Approved</h2>
<p>Dear {{contactName}},</p>
<p><strong>{{companyName}}</strong> has been fully accredited.</p>
<p><strong>Accredited date:</strong> {{accreditedDate}}</p>
<p><a href="{{loginUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>`,
  description: 'Sent to the company contact when accreditation is fully approved',
  variables: ['companyName', 'contactName', 'accreditedDate', 'loginUrl', 'supportEmail'],
  is_active: true,
};

export const ACCREDITATION_REVISION_REQUESTED_TEMPLATE = {
  type: 'accreditation-revision-requested',
  name: 'Accreditation Revision Requested',
  subject: '{{companyName}} - Accreditation changes requested',
  html_content: `<h2>Accreditation Changes Requested</h2>
<p>Dear {{contactName}},</p>
<p>Changes are required for <strong>{{companyName}}</strong> before accreditation can be approved.</p>
<p>{{feedback}}</p>
<p><a href="{{loginUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>`,
  description: 'Sent to the company contact when an approver requests revision',
  variables: ['companyName', 'contactName', 'feedback', 'loginUrl', 'supportEmail'],
  is_active: true,
};

export const DEFAULT_EMAIL_TEMPLATES = [
  SUPPLIER_INVITATION_EMAIL_TEMPLATE,
  ACCREDITATION_MANAGER_APPROVAL_TEMPLATE,
  ACCREDITATION_HS_APPROVAL_TEMPLATE,
  ACCREDITATION_APPROVED_TEMPLATE,
  ACCREDITATION_REVISION_REQUESTED_TEMPLATE,
];

const { prepareEmailHtml } = require('./emailWrapper');
const { DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME, sendEmailViaResend } = require('./resend');
const { buildApprovalPageUrl, issueApprovalToken } = require('./accreditationApprovalTokens');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';
const LOGIN_URL = 'https://contractorhq.co.nz/sign-in-contractor';

const FALLBACK_TEMPLATES = {
  'accreditation-manager-approval': {
    subject: '{{companyName}} - Accreditation awaiting your approval',
    html_content: `<h2>Accreditation Approval Required</h2>
<p>Hello {{approverName}},</p>
<p><strong>{{companyName}}</strong> has submitted their accreditation and is awaiting your approval.</p>
<p><a href="{{approvalUrl}}">Review and approve</a></p>`,
  },
  'accreditation-hs-approval': {
    subject: '{{companyName}} - H&S accreditation approval required',
    html_content: `<h2>H&amp;S Accreditation Approval Required</h2>
<p>Hello {{approverName}},</p>
<p><strong>{{companyName}}</strong> requires your H&amp;S approval.</p>
<p><a href="{{approvalUrl}}">Review and approve</a></p>`,
  },
  'accreditation-approved': {
    subject: '{{companyName}} - Your accreditation has been approved',
    html_content: `<h2>Accreditation Approved</h2>
<p>Dear {{contactName}},</p>
<p><strong>{{companyName}}</strong> has been fully accredited.</p>
<p><strong>Accredited date:</strong> {{accreditedDate}}</p>
<p><a href="{{loginUrl}}">Login to Contractor Hub</a></p>`,
  },
  'accreditation-revision-requested': {
    subject: '{{companyName}} - Accreditation changes requested',
    html_content: `<h2>Accreditation Changes Requested</h2>
<p>Dear {{contactName}},</p>
<p>Changes are required for <strong>{{companyName}}</strong>.</p>
<p>{{feedback}}</p>
<p><a href="{{loginUrl}}">Login to Contractor Hub</a></p>`,
  },
};

async function getEmailTemplate(type) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/email_templates?type=eq.${encodeURIComponent(type)}&is_active=eq.true&select=*`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.length) {
        return data[0];
      }
    }
  } catch (error) {
    console.warn(`Could not fetch email template (${type}):`, error.message);
  }
  return FALLBACK_TEMPLATES[type] || null;
}

function renderTemplate(template, variables = {}) {
  let subject = template.subject;
  let content = template.html_content;

  Object.entries(variables).forEach(([key, value]) => {
    const safeValue = value == null ? '' : String(value);
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, safeValue);
    content = content.replace(regex, safeValue);
  });

  return { subject, content };
}

async function sendTemplateEmail({ type, toEmail, toName, variables }) {
  const template = await getEmailTemplate(type);
  if (!template) {
    throw new Error(`Email template not found: ${type}`);
  }

  const rendered = renderTemplate(template, {
    supportEmail: SUPPORT_EMAIL,
    loginUrl: LOGIN_URL,
    ...variables,
  });

  const htmlContent = prepareEmailHtml(rendered.content);
  await sendEmailViaResend({
    toEmail,
    toName,
    subject: rendered.subject,
    htmlContent,
    fromEmail: DEFAULT_FROM_EMAIL,
    fromName: DEFAULT_FROM_NAME,
  });
}

function formatContactName(company) {
  const parts = [company.contact_name, company.contact_surname].filter(Boolean);
  return parts.join(' ').trim() || 'Contractor';
}

function formatAccreditedDate(value) {
  if (!value) {
    return new Date().toLocaleDateString('en-NZ', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function sendManagerApprovalRequest(company, manager, baseUrl) {
  const { token } = await issueApprovalToken(company.id, 'manager');
  const approvalUrl = buildApprovalPageUrl(token, baseUrl);

  await sendTemplateEmail({
    type: 'accreditation-manager-approval',
    toEmail: manager.email,
    toName: manager.name,
    variables: {
      companyName: company.name,
      approverName: manager.name,
      approvalUrl,
    },
  });
}

async function sendHsApprovalRequest(company, hsPerson, baseUrl) {
  const { token } = await issueApprovalToken(company.id, 'hs');
  const approvalUrl = buildApprovalPageUrl(token, baseUrl);

  await sendTemplateEmail({
    type: 'accreditation-hs-approval',
    toEmail: hsPerson.email,
    toName: hsPerson.name,
    variables: {
      companyName: company.name,
      approverName: hsPerson.name,
      approvalUrl,
    },
  });
}

async function sendAccreditationApprovedEmail(company) {
  const toEmail = company.contact_email;
  if (!toEmail) {
    console.warn(`No contact_email for company ${company.id}; skipping approved email`);
    return;
  }

  await sendTemplateEmail({
    type: 'accreditation-approved',
    toEmail,
    toName: formatContactName(company),
    variables: {
      companyName: company.name,
      contactName: formatContactName(company),
      accreditedDate: formatAccreditedDate(company.accredited_date),
    },
  });
}

async function sendRevisionRequestedEmail(company, feedback) {
  const toEmail = company.contact_email;
  if (!toEmail) {
    console.warn(`No contact_email for company ${company.id}; skipping revision email`);
    return;
  }

  await sendTemplateEmail({
    type: 'accreditation-revision-requested',
    toEmail,
    toName: formatContactName(company),
    variables: {
      companyName: company.name,
      contactName: formatContactName(company),
      feedback: feedback || 'Changes are required before your accreditation can be approved.',
    },
  });
}

module.exports = {
  sendAccreditationApprovedEmail,
  sendHsApprovalRequest,
  sendManagerApprovalRequest,
  sendRevisionRequestedEmail,
};

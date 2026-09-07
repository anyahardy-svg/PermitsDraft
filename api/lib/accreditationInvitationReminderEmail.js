const { wrapEmailHtml, buildEmailFooterText } = require('./emailWrapper');
const { fetchAuthUserByEmail } = require('../supabaseAdmin');
const {
  DEFAULT_FROM_EMAIL,
  DEFAULT_FROM_NAME,
  getResendApiKey,
  sendEmailViaResend,
} = require('./resend');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const FROM_EMAIL = DEFAULT_FROM_EMAIL;
const FROM_NAME = DEFAULT_FROM_NAME;
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';
const TEMPLATE_TYPE = 'invitation-reminder';

const TEMPLATE_VARIABLE_DEFAULTS = {
  contactName: 'Contractor',
};

const DEFAULT_REMINDER_TEMPLATE = {
  subject: 'Reminder: {{companyName}} - Complete Your Company Accreditation',
  html_content: `<h2>Reminder: Complete Your Company Accreditation</h2>
<p>Dear {{contactName}},</p>
<p>We previously invited {{companyName}} to complete an accreditation questionnaire, but we have not yet received your submission.</p>
<p><strong>Deadline:</strong> {{deadline}}</p>
<p>To get started, please create a password and access our portal:</p>
<p><a href="{{signupUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Complete Your Accreditation</a></p>
<p style="margin-top: 16px; padding: 12px; background-color: #F0F9FF; border-left: 3px solid #3B82F6; font-size: 13px;">
  <strong>Already have an account?</strong> If you have already registered, please log in or use the "Forgot Password" option on the sign-in page.
</p>
<p>If you have any questions, please contact us at {{supportEmail}}</p>`,
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplate(template, variables = {}) {
  let subject = template.subject;
  let content = template.html_content;

  const templateVariables = Array.isArray(template?.variables) ? template.variables : [];
  const keys = new Set([
    ...templateVariables,
    ...Object.keys(TEMPLATE_VARIABLE_DEFAULTS),
    ...Object.keys(variables),
  ]);

  keys.forEach((key) => {
    const rawValue = variables[key];
    const hasValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';
    const value = hasValue ? String(rawValue).trim() : (TEMPLATE_VARIABLE_DEFAULTS[key] || '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    content = content.replace(regex, value);
  });

  return { subject, content };
}

async function getEmailTemplate(type) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/email_templates?type=eq.${encodeURIComponent(type)}&is_active=eq.true&select=*`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.[0] || null;
  } catch (error) {
    console.warn(`Could not fetch email template (${type}):`, error.message);
    return null;
  }
}

function formatDeadline(deadline) {
  if (!deadline) {
    return 'As soon as possible';
  }

  return new Date(deadline).toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Pacific/Auckland',
  });
}

function buildSignupUrl(toEmail, companyId) {
  const companyIdParam = companyId ? `&companyId=${encodeURIComponent(companyId)}` : '';
  return `https://contractorhq.co.nz/sign-in-contractor?type=invited&email=${encodeURIComponent(toEmail)}${companyIdParam}`;
}

function stripHtmlTags(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function userNeedsPasswordSetup(toEmail) {
  const existingUser = await fetchAuthUserByEmail(toEmail);
  if (!existingUser) {
    return true;
  }
  return !existingUser.last_sign_in_at;
}

async function buildReminderEmailContent({
  toEmail,
  companyName,
  companyId,
  deadline,
  contactName,
}) {
  const resolvedContactName = (contactName || '').trim() || 'Contractor';
  const deadlineStr = formatDeadline(deadline);
  const signupUrl = buildSignupUrl(toEmail, companyId);
  const needsPasswordSetup = await userNeedsPasswordSetup(toEmail);

  const dbTemplate = await getEmailTemplate(TEMPLATE_TYPE);
  if (dbTemplate) {
    return renderTemplate(dbTemplate, {
      companyName,
      contactName: resolvedContactName,
      deadline: deadlineStr,
      signupUrl,
      supportEmail: SUPPORT_EMAIL,
    });
  }

  if (needsPasswordSetup) {
    return {
      subject: `Reminder: ${companyName} - Complete Your Company Accreditation`,
      content: `
        <h2>Reminder: Complete Your Company Accreditation</h2>
        <p>Dear ${escapeHtml(resolvedContactName)},</p>
        <p>We previously invited ${escapeHtml(companyName)} to complete an accreditation questionnaire, but we have not yet received your submission.</p>
        <p><strong>Deadline:</strong> ${deadlineStr}</p>
        <p>To get started, please create a password and access our portal:</p>
        <p><a href="${signupUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Create Your Password</a></p>
        <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
      `,
    };
  }

  return {
    subject: `Reminder: Complete ${companyName} Accreditation`,
    content: `
      <h2>Reminder: Complete Your Company Accreditation</h2>
      <p>Dear ${escapeHtml(resolvedContactName)},</p>
      <p>We previously invited ${escapeHtml(companyName)} to complete an accreditation questionnaire, but we have not yet received your submission.</p>
      <p><strong>Deadline:</strong> ${deadlineStr}</p>
      <p>Please log in to your account to continue:</p>
      <p><a href="https://contractorhq.co.nz/sign-in-contractor" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
      <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
    `,
  };
}

async function sendAccreditationInvitationReminderEmail({
  toEmail,
  companyName,
  companyId,
  deadline,
  contactName,
}) {
  if (!getResendApiKey()) {
    throw new Error('Email service not configured');
  }

  const { subject, content } = await buildReminderEmailContent({
    toEmail,
    companyName,
    companyId,
    deadline,
    contactName,
  });

  const plainTextContent = `${stripHtmlTags(content)}\n\n${buildEmailFooterText()}`;
  const wrappedHtmlContent = wrapEmailHtml(content);

  const data = await sendEmailViaResend({
    toEmail,
    subject,
    htmlContent: wrappedHtmlContent,
    textContent: plainTextContent,
    fromEmail: FROM_EMAIL,
    fromName: FROM_NAME,
    replyTo: SUPPORT_EMAIL,
    headers: {
      'List-Unsubscribe': `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
      'X-Priority': '3',
      'X-Mailer': 'Contractor HQ',
    },
  });

  return { messageId: data.messageId };
}

module.exports = {
  TEMPLATE_TYPE,
  sendAccreditationInvitationReminderEmail,
};

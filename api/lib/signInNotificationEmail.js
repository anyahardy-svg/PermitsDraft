const { prepareEmailHtml } = require('./emailWrapper');
const { DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME, sendEmailViaResend } = require('./resend');
const { renderTemplate } = require('./emailTemplateHelpers');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';

const FALLBACK_TEMPLATE = {
  subject: '{{siteName}} - {{personType}} sign-in: {{personName}}',
  html_content: `<h2>Site Sign-In Notification</h2>
<p>Hello {{recipientName}},</p>
<p>A {{personType}} has signed in at <strong>{{siteName}}</strong>.</p>
<p><strong>Name:</strong> {{personName}}<br/>
<strong>Company:</strong> {{personCompany}}<br/>
<strong>Phone:</strong> {{personPhone}}<br/>
<strong>Check-in time:</strong> {{checkInTime}}<br/>
<strong>Visiting:</strong> {{visitingPersonName}}</p>`,
};

function getServiceRoleHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

function personAssignedToSite(person, siteId) {
  const siteIds = person?.site_ids || person?.siteIds || [];
  return Array.isArray(siteIds) && siteIds.includes(siteId);
}

function buildSignInDetails(signInRecord, siteName) {
  const isContractor = Boolean(signInRecord?.contractor_id);
  const checkInTime = signInRecord?.check_in_time
    ? new Date(signInRecord.check_in_time).toLocaleString('en-NZ', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return {
    siteName: siteName || 'Unknown site',
    personType: isContractor ? 'contractor' : 'visitor',
    personName: isContractor
      ? (signInRecord?.contractor_name || 'Unknown contractor')
      : (signInRecord?.visitor_name || 'Unknown visitor'),
    personCompany: isContractor
      ? (signInRecord?.contractor_company || 'Unknown')
      : (signInRecord?.visitor_company || 'Unknown'),
    personPhone: isContractor
      ? (signInRecord?.contractor_phone || 'Not provided')
      : (signInRecord?.phone_number || 'Not provided'),
    checkInTime,
    visitingPersonName: signInRecord?.visiting_person_name || 'Not specified',
  };
}

function resolveVisitingPersonRecipient(visitingPersonName, siteId, adminUsers = [], permitIssuers = []) {
  const normalizedTarget = normalizeName(visitingPersonName);
  if (!normalizedTarget) {
    return null;
  }

  const candidates = [];
  for (const admin of adminUsers || []) {
    if (!personAssignedToSite(admin, siteId)) continue;
    if (normalizeName(admin.name) === normalizedTarget) {
      candidates.push({ email: admin.email, name: admin.name, source: 'admin' });
    }
  }
  for (const issuer of permitIssuers || []) {
    if (!personAssignedToSite(issuer, siteId)) continue;
    if (normalizeName(issuer.name) === normalizedTarget) {
      candidates.push({ email: issuer.email, name: issuer.name, source: 'permit_issuer' });
    }
  }

  return candidates[0] || null;
}

function resolveDefaultManagerRecipient(site) {
  if (!site?.send_default_sign_in_notifications) {
    return null;
  }

  const manager = site?.default_notification_manager;
  if (!manager?.email) {
    return null;
  }

  return {
    email: manager.email,
    name: manager.name,
    source: 'default_manager',
  };
}

function resolveSignInNotificationRecipient({
  signInRecord,
  site,
  adminUsers = [],
  permitIssuers = [],
}) {
  const visitingPersonName = signInRecord?.visiting_person_name;
  if (visitingPersonName?.trim()) {
    const visitingRecipient = resolveVisitingPersonRecipient(
      visitingPersonName,
      site?.id,
      adminUsers,
      permitIssuers
    );
    if (visitingRecipient?.email) {
      return visitingRecipient;
    }
  }

  return resolveDefaultManagerRecipient(site);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: getServiceRoleHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function getEmailTemplate(type) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/email_templates?type=eq.${encodeURIComponent(type)}&is_active=eq.true&select=*&limit=1`;
    const data = await fetchJson(url);
    if (data?.length) {
      return data[0];
    }
  } catch (error) {
    console.warn(`Could not fetch email template (${type}):`, error.message);
  }

  return FALLBACK_TEMPLATE;
}

async function loadSignInNotificationContext(signInId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const signInUrl = `${SUPABASE_URL}/rest/v1/sign_ins?id=eq.${encodeURIComponent(signInId)}&select=*&limit=1`;
  const signInRows = await fetchJson(signInUrl);
  const signInRecord = signInRows?.[0];
  if (!signInRecord) {
    return { success: false, status: 404, error: 'Sign-in record not found' };
  }

  const siteUrl = `${SUPABASE_URL}/rest/v1/sites?id=eq.${encodeURIComponent(signInRecord.site_id)}&select=id,name,default_notification_manager_id,send_default_sign_in_notifications&limit=1`;
  const siteRows = await fetchJson(siteUrl);
  const siteRow = siteRows?.[0];
  if (!siteRow) {
    return { success: false, status: 404, error: 'Site not found for sign-in' };
  }

  let defaultManager = null;
  if (siteRow.default_notification_manager_id) {
    const managerUrl = `${SUPABASE_URL}/rest/v1/admin_users?id=eq.${encodeURIComponent(siteRow.default_notification_manager_id)}&select=id,name,email&limit=1`;
    const managerRows = await fetchJson(managerUrl);
    defaultManager = managerRows?.[0] || null;
  }

  const adminUsersUrl = `${SUPABASE_URL}/rest/v1/admin_users?select=id,name,email,site_ids`;
  const permitIssuersUrl = `${SUPABASE_URL}/rest/v1/permit_issuers?select=id,name,email,site_ids`;

  const [adminUsers, permitIssuers] = await Promise.all([
    fetchJson(adminUsersUrl),
    fetchJson(permitIssuersUrl),
  ]);

  const site = {
    id: siteRow.id,
    name: siteRow.name,
    send_default_sign_in_notifications: siteRow.send_default_sign_in_notifications !== false,
    default_notification_manager: defaultManager,
  };

  return {
    success: true,
    signInRecord,
    site,
    adminUsers: adminUsers || [],
    permitIssuers: permitIssuers || [],
  };
}

async function sendSignInNotificationEmail({ recipient, signInRecord, site }) {
  const details = buildSignInDetails(signInRecord, site?.name);
  const template = await getEmailTemplate('sign-in-notification');
  const rendered = renderTemplate(template, {
    recipientName: recipient.name || 'Site contact',
    ...details,
  });

  const wrappedHtmlContent = prepareEmailHtml(rendered.content);
  const data = await sendEmailViaResend({
    toEmail: recipient.email,
    toName: recipient.name,
    subject: rendered.subject,
    htmlContent: wrappedHtmlContent,
    textContent: rendered.subject,
    fromEmail: DEFAULT_FROM_EMAIL,
    fromName: DEFAULT_FROM_NAME,
    replyTo: SUPPORT_EMAIL,
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'Contractor HQ',
    },
  });

  return {
    success: true,
    messageId: data.messageId,
    recipientEmail: recipient.email,
    recipientSource: recipient.source,
  };
}

async function notifySignIn(signInId) {
  const context = await loadSignInNotificationContext(signInId);
  if (!context.success) {
    return context;
  }

  const recipient = resolveSignInNotificationRecipient(context);
  if (!recipient?.email) {
    return {
      success: true,
      skipped: true,
      reason: 'No notification recipient configured for this sign-in',
    };
  }

  return sendSignInNotificationEmail({
    recipient,
    signInRecord: context.signInRecord,
    site: context.site,
  });
}

module.exports = {
  buildSignInDetails,
  resolveVisitingPersonRecipient,
  resolveDefaultManagerRecipient,
  resolveSignInNotificationRecipient,
  loadSignInNotificationContext,
  notifySignIn,
};

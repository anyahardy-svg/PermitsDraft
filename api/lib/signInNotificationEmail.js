const { prepareEmailHtml } = require('./emailWrapper');
const { DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME, sendEmailViaResend } = require('./resend');
const { renderTemplate } = require('./emailTemplateHelpers');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';
const NZ_TIMEZONE = 'Pacific/Auckland';

const FALLBACK_TEMPLATE = {
  subject: '{{siteName}} - {{personType}} sign-in: {{personName}}',
  html_content: `<h2>Site Sign-In Notification</h2>
<p>Hello {{recipientName}},</p>
<p>A {{personType}} has signed in at <strong>{{siteName}}</strong>.</p>
<p><strong>Name:</strong> {{personName}}<br/>
<strong>Company:</strong> {{personCompany}}<br/>
<strong>Phone:</strong> {{personPhone}}<br/>
<strong>Induction status:</strong> {{inductionStatus}}<br/>
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
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function formatPhoneForDisplay(phone) {
  if (!phone) return 'Not provided';
  const phoneStr = String(phone).trim();
  if (!phoneStr) return 'Not provided';
  if (phoneStr.startsWith('0')) return phoneStr;
  return `0${phoneStr}`;
}

function formatInductionStatus(signInRecord) {
  const isContractor = Boolean(signInRecord?.contractor_id);
  if (!isContractor) {
    return 'Not applicable (visitor)';
  }

  const expiry = signInRecord?.induction_expires_at
    ? new Date(signInRecord.induction_expires_at).toLocaleDateString('en-NZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: NZ_TIMEZONE,
      })
    : null;

  switch (signInRecord?.induction_status) {
    case 'inducted':
      return expiry ? `Inducted at this site (expires ${expiry})` : 'Inducted at this site';
    case 'induction_expired':
      return expiry ? `Induction expired at this site (expired ${expiry})` : 'Induction expired at this site';
    default:
      return 'Not inducted at this site';
  }
}

function personAssignedToSite(person, siteId) {
  if (!siteId) {
    return false;
  }
  const siteIds = person?.site_ids || person?.siteIds;
  if (!Array.isArray(siteIds) || siteIds.length === 0) {
    return false;
  }
  const normalizedSiteId = String(siteId);
  return siteIds.some((id) => String(id) === normalizedSiteId);
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
        timeZone: NZ_TIMEZONE,
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
    personPhone: formatPhoneForDisplay(
      isContractor ? signInRecord?.contractor_phone : signInRecord?.phone_number
    ),
    inductionStatus: formatInductionStatus(signInRecord),
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

function resolveVisitingPersonByEmail(visitingPersonEmail, siteId, adminUsers = [], permitIssuers = []) {
  const normalizedTarget = normalizeEmail(visitingPersonEmail);
  if (!normalizedTarget) {
    return null;
  }

  for (const admin of adminUsers || []) {
    if (!personAssignedToSite(admin, siteId)) continue;
    if (normalizeEmail(admin.email) === normalizedTarget) {
      return { email: admin.email, name: admin.name, source: 'admin' };
    }
  }
  for (const issuer of permitIssuers || []) {
    if (!personAssignedToSite(issuer, siteId)) continue;
    if (normalizeEmail(issuer.email) === normalizedTarget) {
      return { email: issuer.email, name: issuer.name, source: 'permit_issuer' };
    }
  }

  return null;
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
  visitingPersonEmail = null,
}) {
  const siteId = site?.id;

  if (visitingPersonEmail?.trim()) {
    const byEmail = resolveVisitingPersonByEmail(
      visitingPersonEmail,
      siteId,
      adminUsers,
      permitIssuers
    );
    if (byEmail?.email) {
      return byEmail;
    }
  }

  const visitingPersonName = signInRecord?.visiting_person_name;
  if (visitingPersonName?.trim()) {
    const visitingRecipient = resolveVisitingPersonRecipient(
      visitingPersonName,
      siteId,
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

async function fetchSiteScopedContacts(admin, siteId) {
  const [adminsResult, issuersResult] = await Promise.all([
    admin
      .from('admin_users')
      .select('id, name, email, site_ids')
      .contains('site_ids', [siteId]),
    admin
      .from('permit_issuers')
      .select('id, name, email, site_ids')
      .contains('site_ids', [siteId]),
  ]);

  if (adminsResult.error) {
    console.warn('Sign-in notification: site admin lookup failed:', adminsResult.error.message);
  }
  if (issuersResult.error) {
    console.warn('Sign-in notification: permit issuer lookup failed:', issuersResult.error.message);
  }

  return {
    adminUsers: adminsResult.data || [],
    permitIssuers: issuersResult.data || [],
  };
}

async function lookupRecipientByEmail(admin, siteId, visitingPersonEmail) {
  const email = String(visitingPersonEmail || '').trim();
  if (!email || !siteId) {
    return null;
  }

  for (const table of ['admin_users', 'permit_issuers']) {
    const { data, error } = await admin
      .from(table)
      .select('id, name, email, site_ids')
      .ilike('email', email)
      .limit(3);

    if (error) {
      console.warn(`Sign-in notification: ${table} email lookup failed:`, error.message);
      continue;
    }

    for (const row of data || []) {
      if (!personAssignedToSite(row, siteId)) {
        continue;
      }
      if (normalizeEmail(row.email) === normalizeEmail(email)) {
        return {
          email: row.email,
          name: row.name,
          source: table === 'admin_users' ? 'admin' : 'permit_issuer',
        };
      }
    }
  }

  return null;
}

async function loadSignInNotificationContext(signInId, options = {}) {
  const { getSupabaseAdmin } = require('../supabaseAdmin');
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const { data: signInRecord, error: signInError } = await admin
    .from('sign_ins')
    .select('*')
    .eq('id', signInId)
    .maybeSingle();

  if (signInError) {
    throw signInError;
  }
  if (!signInRecord) {
    return { success: false, status: 404, error: 'Sign-in record not found' };
  }

  const siteId = signInRecord.site_id;
  const { data: siteRow, error: siteError } = await admin
    .from('sites')
    .select('id, name, default_notification_manager_id, send_default_sign_in_notifications')
    .eq('id', siteId)
    .maybeSingle();

  if (siteError) {
    throw siteError;
  }
  if (!siteRow) {
    return { success: false, status: 404, error: 'Site not found for sign-in' };
  }

  let defaultManager = null;
  if (siteRow.default_notification_manager_id) {
    const { data: managerRow } = await admin
      .from('admin_users')
      .select('id, name, email')
      .eq('id', siteRow.default_notification_manager_id)
      .maybeSingle();
    defaultManager = managerRow || null;
  }

  const site = {
    id: siteRow.id,
    name: siteRow.name,
    send_default_sign_in_notifications: siteRow.send_default_sign_in_notifications !== false,
    default_notification_manager: defaultManager,
  };

  const needsVisitingLookup =
    Boolean(options.visitingPersonEmail?.trim()) || Boolean(signInRecord.visiting_person_name?.trim());

  let adminUsers = [];
  let permitIssuers = [];
  let preResolvedRecipient = null;

  if (options.visitingPersonEmail?.trim()) {
    preResolvedRecipient = await lookupRecipientByEmail(admin, siteId, options.visitingPersonEmail);
  }

  if (needsVisitingLookup && !preResolvedRecipient) {
    const contacts = await fetchSiteScopedContacts(admin, siteId);
    adminUsers = contacts.adminUsers;
    permitIssuers = contacts.permitIssuers;
  }

  return {
    success: true,
    signInRecord,
    site,
    adminUsers,
    permitIssuers,
    preResolvedRecipient,
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

async function notifySignIn(signInId, options = {}) {
  const context = await loadSignInNotificationContext(signInId, options);
  if (!context.success) {
    return context;
  }

  const recipient =
    context.preResolvedRecipient ||
    resolveSignInNotificationRecipient({
      signInRecord: context.signInRecord,
      site: context.site,
      adminUsers: context.adminUsers,
      permitIssuers: context.permitIssuers,
      visitingPersonEmail: options.visitingPersonEmail || null,
    });
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
  formatPhoneForDisplay,
  formatInductionStatus,
  buildSignInDetails,
  resolveVisitingPersonRecipient,
  resolveVisitingPersonByEmail,
  resolveDefaultManagerRecipient,
  resolveSignInNotificationRecipient,
  loadSignInNotificationContext,
  notifySignIn,
};

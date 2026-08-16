const { getSupabaseAdmin } = require('../supabaseAdmin');
const {
  TEMPLATE_TYPE,
  sendAccreditationInvitationReminderEmail,
} = require('../lib/accreditationInvitationReminderEmail');

const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_REMINDER_INTERVAL_DAYS = 7;
const TIMEZONE = 'Pacific/Auckland';

function getBatchSize() {
  const parsed = parseInt(process.env.REMINDER_BATCH_SIZE || String(DEFAULT_BATCH_SIZE), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.min(parsed, 300);
}

function getReminderIntervalDays() {
  const parsed = parseInt(
    process.env.REMINDER_INTERVAL_DAYS || String(DEFAULT_REMINDER_INTERVAL_DAYS),
    10,
  );
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REMINDER_INTERVAL_DAYS;
  }
  return parsed;
}

function getAucklandDateInfo(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-NZ', {
    timeZone: TIMEZONE,
    weekday: 'short',
  });

  const parts = {};
  formatter.formatToParts(date).forEach((part) => {
    if (part.type === 'weekday') {
      parts.weekday = part.value;
    }
  });

  return parts;
}

function isWeekendWeekday(weekday = '') {
  const normalized = String(weekday).slice(0, 3).toLowerCase();
  return normalized === 'sat' || normalized === 'sun';
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildNextReminderAt(fromDate = new Date()) {
  return addDays(fromDate, getReminderIntervalDays()).toISOString();
}

async function fetchDueCompanies(adminClient) {
  const nowIso = new Date().toISOString();
  const { data, error } = await adminClient
    .from('companies')
    .select(`
      id,
      name,
      contact_name,
      contact_email,
      accreditation_deadline,
      accreditation_invitation_sent_at,
      accreditation_invitation_reminder_sent_at,
      accreditation_invitation_reminder_count,
      accreditation_next_reminder_at,
      accreditation_status,
      accreditation_last_updated,
      accredited_date,
      company_active
    `)
    .not('accreditation_invitation_sent_at', 'is', null)
    .is('accreditation_last_updated', null)
    .is('accredited_date', null)
    .in('accreditation_status', ['none', 'started'])
    .or('company_active.is.null,company_active.eq.true')
    .lte('accreditation_next_reminder_at', nowIso)
    .order('accreditation_next_reminder_at', { ascending: true })
    .order('accreditation_invitation_sent_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(getBatchSize());

  if (error) {
    throw new Error(`Failed to fetch due companies: ${error.message}`);
  }

  return data || [];
}

async function resolveRecipient(adminClient, company) {
  const { data: adminAccessRows, error } = await adminClient
    .from('company_admin_access')
    .select('email, name')
    .eq('company_id', company.id)
    .order('granted_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch company admin access: ${error.message}`);
  }

  const latestAdmin = adminAccessRows?.[0];
  if (latestAdmin?.email) {
    return {
      email: latestAdmin.email.trim(),
      contactName: latestAdmin.name || company.contact_name || null,
      source: 'company_admin_access',
    };
  }

  if (company.contact_email) {
    return {
      email: company.contact_email.trim(),
      contactName: company.contact_name || null,
      source: 'contact_email',
    };
  }

  return null;
}

async function logEmailSend(adminClient, entry) {
  const { error } = await adminClient.from('email_send_log').insert(entry);
  if (error) {
    console.warn('Failed to write email_send_log:', error.message);
  }
}

async function markReminderSent(adminClient, company) {
  const nextCount = (company.accreditation_invitation_reminder_count || 0) + 1;
  const nowIso = new Date().toISOString();
  const { error } = await adminClient
    .from('companies')
    .update({
      accreditation_invitation_reminder_sent_at: nowIso,
      accreditation_invitation_reminder_count: nextCount,
      accreditation_next_reminder_at: buildNextReminderAt(),
    })
    .eq('id', company.id);

  if (error) {
    throw new Error(`Failed to update reminder tracking for company ${company.id}: ${error.message}`);
  }
}

async function deferReminder(adminClient, company, reason) {
  const { error } = await adminClient
    .from('companies')
    .update({
      accreditation_next_reminder_at: buildNextReminderAt(),
    })
    .eq('id', company.id);

  if (error) {
    console.warn(`Failed to defer reminder for company ${company.id}:`, error.message);
  }

  await logEmailSend(adminClient, {
    email_type: TEMPLATE_TYPE,
    company_id: company.id,
    recipient_email: company.contact_email || 'unknown',
    status: 'skipped',
    error_message: reason,
    metadata: { stage: 'defer_reminder' },
  });
}

async function runAccreditationInvitationReminders({ dryRun = false } = {}) {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const { weekday } = getAucklandDateInfo();
  const weekendInNz = isWeekendWeekday(weekday);

  if (weekendInNz) {
    return {
      dryRun,
      batchSize: getBatchSize(),
      reminderIntervalDays: getReminderIntervalDays(),
      weekdayOnly: true,
      runSkipped: true,
      skipReason: 'weekend',
      weekdayName: weekday,
      dueTotal: 0,
      scheduledToday: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
  }

  const dueCompanies = await fetchDueCompanies(adminClient);

  const summary = {
    dryRun,
    batchSize: getBatchSize(),
    reminderIntervalDays: getReminderIntervalDays(),
    weekdayOnly: true,
    runSkipped: false,
    weekdayName: weekday,
    dueTotal: dueCompanies.length,
    scheduledToday: dueCompanies.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (const company of dueCompanies) {
    const baseResult = {
      companyId: company.id,
      companyName: company.name,
      nextReminderAt: company.accreditation_next_reminder_at,
    };

    let recipient;
    try {
      recipient = await resolveRecipient(adminClient, company);
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        ...baseResult,
        status: 'failed',
        reason: error.message,
      });
      await logEmailSend(adminClient, {
        email_type: TEMPLATE_TYPE,
        company_id: company.id,
        recipient_email: company.contact_email || 'unknown',
        status: 'failed',
        error_message: error.message,
        metadata: { stage: 'resolve_recipient' },
      });
      continue;
    }

    if (!recipient?.email) {
      summary.skipped += 1;
      summary.results.push({
        ...baseResult,
        status: 'skipped',
        reason: 'no_recipient_email',
      });
      if (!dryRun) {
        await deferReminder(adminClient, company, 'No recipient email found');
      }
      continue;
    }

    if (dryRun) {
      summary.results.push({
        ...baseResult,
        status: 'dry_run',
        recipientEmail: recipient.email,
        recipientSource: recipient.source,
      });
      continue;
    }

    try {
      const sendResult = await sendAccreditationInvitationReminderEmail({
        toEmail: recipient.email,
        companyName: company.name,
        companyId: company.id,
        deadline: company.accreditation_deadline,
        contactName: recipient.contactName,
      });

      await markReminderSent(adminClient, company);
      await logEmailSend(adminClient, {
        email_type: TEMPLATE_TYPE,
        company_id: company.id,
        recipient_email: recipient.email,
        status: 'sent',
        metadata: {
          recipientSource: recipient.source,
          messageId: sendResult.messageId || null,
        },
      });

      summary.sent += 1;
      summary.results.push({
        ...baseResult,
        status: 'sent',
        recipientEmail: recipient.email,
        recipientSource: recipient.source,
        messageId: sendResult.messageId || null,
      });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        ...baseResult,
        status: 'failed',
        recipientEmail: recipient.email,
        reason: error.message,
      });
      await logEmailSend(adminClient, {
        email_type: TEMPLATE_TYPE,
        company_id: company.id,
        recipient_email: recipient.email,
        status: 'failed',
        error_message: error.message,
        metadata: { recipientSource: recipient.source },
      });
    }
  }

  return summary;
}

module.exports = {
  buildNextReminderAt,
  getReminderIntervalDays,
  runAccreditationInvitationReminders,
};

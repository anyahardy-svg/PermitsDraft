const { getSupabaseAdmin } = require('../supabaseAdmin');
const {
  TEMPLATE_TYPE,
  sendAccreditationInvitationReminderEmail,
} = require('../lib/accreditationInvitationReminderEmail');

const DEFAULT_BATCH_SIZE = 200;
const TIMEZONE = 'Pacific/Auckland';

function getBatchSize() {
  const parsed = parseInt(process.env.REMINDER_BATCH_SIZE || String(DEFAULT_BATCH_SIZE), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.min(parsed, 300);
}

function getAucklandDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-NZ', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = {};
  formatter.formatToParts(date).forEach((part) => {
    if (part.type !== 'literal') {
      parts[part.type] = parseInt(part.value, 10);
    }
  });

  return parts;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function isSameAucklandDate(left, right) {
  const leftParts = getAucklandDateParts(left);
  const rightParts = getAucklandDateParts(right);
  return (
    leftParts.year === rightParts.year
    && leftParts.month === rightParts.month
    && leftParts.day === rightParts.day
  );
}

function getBatchRangesForToday(date = new Date()) {
  const batchSize = getBatchSize();
  const { year, month, day } = getAucklandDateParts(date);
  const daysInMonth = getDaysInMonth(year, month);
  const dayOfMonth = day;

  const ranges = [{
    start: (dayOfMonth - 1) * batchSize + 1,
    end: dayOfMonth * batchSize,
    label: `${(dayOfMonth - 1) * batchSize + 1}-${dayOfMonth * batchSize}`,
  }];

  if (dayOfMonth === daysInMonth) {
    const overflowStart = daysInMonth * batchSize + 1;
    ranges.push({
      start: overflowStart,
      end: Number.POSITIVE_INFINITY,
      label: `${overflowStart}+`,
    });
  }

  return {
    batchSize,
    dayOfMonth,
    daysInMonth,
    ranges,
  };
}

function companyIsInBatch(position, ranges) {
  return ranges.some((range) => position >= range.start && position <= range.end);
}

async function fetchEligibleCompanies(adminClient) {
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
    .order('accreditation_invitation_sent_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch eligible companies: ${error.message}`);
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
  const { error } = await adminClient
    .from('companies')
    .update({
      accreditation_invitation_reminder_sent_at: new Date().toISOString(),
      accreditation_invitation_reminder_count: nextCount,
    })
    .eq('id', company.id);

  if (error) {
    throw new Error(`Failed to update reminder tracking for company ${company.id}: ${error.message}`);
  }
}

async function runAccreditationInvitationReminders({ dryRun = false } = {}) {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const batchInfo = getBatchRangesForToday();
  const eligibleCompanies = await fetchEligibleCompanies(adminClient);
  const todaysCompanies = [];

  eligibleCompanies.forEach((company, index) => {
    const position = index + 1;
    if (companyIsInBatch(position, batchInfo.ranges)) {
      todaysCompanies.push({ company, position });
    }
  });

  const summary = {
    dryRun,
    batchSize: batchInfo.batchSize,
    dayOfMonth: batchInfo.dayOfMonth,
    batchRanges: batchInfo.ranges.map((range) => range.label),
    eligibleTotal: eligibleCompanies.length,
    scheduledToday: todaysCompanies.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (const { company, position } of todaysCompanies) {
    const baseResult = {
      companyId: company.id,
      companyName: company.name,
      position,
    };

    if (
      company.accreditation_invitation_reminder_sent_at
      && isSameAucklandDate(company.accreditation_invitation_reminder_sent_at, new Date())
    ) {
      summary.skipped += 1;
      summary.results.push({
        ...baseResult,
        status: 'skipped',
        reason: 'already_sent_today',
      });
      continue;
    }

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
        metadata: { position, stage: 'resolve_recipient' },
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
      await logEmailSend(adminClient, {
        email_type: TEMPLATE_TYPE,
        company_id: company.id,
        recipient_email: 'unknown',
        status: 'skipped',
        error_message: 'No recipient email found',
        metadata: { position, stage: 'resolve_recipient' },
      });
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
          position,
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
        metadata: { position, recipientSource: recipient.source },
      });
    }
  }

  return summary;
}

module.exports = {
  getBatchRangesForToday,
  runAccreditationInvitationReminders,
};

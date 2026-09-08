const { getSupabaseAdmin } = require('../supabaseAdmin');
const {
  TEMPLATE_TYPE,
  sendAccreditationInvitationReminderEmail,
} = require('../lib/accreditationInvitationReminderEmail');
const { applyAccreditationReminderQueryFilters } = require('../lib/accreditationReminderEligibility');
const { buildNextReminderAt } = require('../lib/reminderScheduler');

const COMPANY_SELECT = `
  id,
  name,
  contact_name,
  contact_email,
  contractor_type,
  accreditation_deadline,
  accreditation_invitation_sent_at,
  accreditation_invitation_reminder_sent_at,
  accreditation_invitation_reminder_count,
  accreditation_next_reminder_at,
  accreditation_status,
  accreditation_last_updated,
  accredited_date,
  company_active
`;

async function fetchDueCompanies(adminClient, limit) {
  const nowIso = new Date().toISOString();
  let query = adminClient
    .from('companies')
    .select(COMPANY_SELECT)
    .order('accreditation_next_reminder_at', { ascending: true })
    .order('accreditation_invitation_sent_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);

  query = applyAccreditationReminderQueryFilters(query, nowIso);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch due companies: ${error.message}`);
  }

  return data || [];
}

async function countDueCompanies(adminClient) {
  const nowIso = new Date().toISOString();
  let query = adminClient
    .from('companies')
    .select('id', { count: 'exact', head: true });

  query = applyAccreditationReminderQueryFilters(query, nowIso);

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count due companies: ${error.message}`);
  }

  return count || 0;
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

async function runAccreditationInvitationReminders({
  dryRun = false,
  remainingQuota = 0,
} = {}) {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const dueTotal = await countDueCompanies(adminClient);
  const scheduledToday = Math.min(dueTotal, remainingQuota);

  const summary = {
    type: TEMPLATE_TYPE,
    dryRun,
    dueTotal,
    scheduledToday,
    remainingQuota,
    sent: 0,
    failed: 0,
    skipped: 0,
    deferredDueToQuota: Math.max(dueTotal - remainingQuota, 0),
    results: [],
  };

  if (remainingQuota <= 0) {
    summary.note = 'No remaining daily reminder quota';
    return summary;
  }

  const dueCompanies = await fetchDueCompanies(adminClient, remainingQuota);

  for (const company of dueCompanies) {
    const baseResult = {
      companyId: company.id,
      companyName: company.name,
      contractorType: company.contractor_type || 'D',
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
          contractorType: company.contractor_type || 'D',
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
  runAccreditationInvitationReminders,
};

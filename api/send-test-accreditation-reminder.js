const { getSupabaseAdmin } = require('./supabaseAdmin');
const {
  TEMPLATE_TYPE,
  sendAccreditationInvitationReminderEmail,
} = require('./lib/accreditationInvitationReminderEmail');

async function logTestSend(adminClient, entry) {
  const { error } = await adminClient.from('email_send_log').insert(entry);
  if (error) {
    console.warn('Failed to write test email_send_log:', error.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      toEmail,
      companyName = 'Test Company Ltd',
      contactName = 'Test Contact',
      companyId = null,
      deadline = null,
    } = req.body || {};

    const normalizedEmail = String(toEmail || '').trim();
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Missing toEmail' });
    }

    const sendResult = await sendAccreditationInvitationReminderEmail({
      toEmail: normalizedEmail,
      companyName: String(companyName || 'Test Company Ltd').trim() || 'Test Company Ltd',
      companyId: companyId || null,
      deadline,
      contactName: String(contactName || 'Test Contact').trim() || 'Test Contact',
    });

    const adminClient = getSupabaseAdmin();
    if (adminClient) {
      await logTestSend(adminClient, {
        email_type: TEMPLATE_TYPE,
        company_id: companyId || null,
        recipient_email: normalizedEmail,
        status: 'sent',
        metadata: {
          test: true,
          companyName,
          contactName,
          messageId: sendResult.messageId || null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test reminder sent to ${normalizedEmail}`,
      messageId: sendResult.messageId || null,
    });
  } catch (error) {
    console.error('Failed to send test accreditation reminder:', error);

    const adminClient = getSupabaseAdmin();
    if (adminClient && req.body?.toEmail) {
      await logTestSend(adminClient, {
        email_type: TEMPLATE_TYPE,
        company_id: req.body.companyId || null,
        recipient_email: String(req.body.toEmail).trim(),
        status: 'failed',
        error_message: error.message,
        metadata: { test: true },
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test reminder email',
    });
  }
}

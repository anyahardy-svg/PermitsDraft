const RESEND_API_URL = 'https://api.resend.com/emails';

const DEFAULT_FROM_EMAIL = 'noreply@contractorhq.co.nz';
const DEFAULT_FROM_NAME = 'Contractor HQ';

function getResendApiKey() {
  return process.env.RESEND_API_KEY || '';
}

function formatEmailAddress(email, name) {
  const trimmedEmail = String(email || '').trim();
  const trimmedName = String(name || '').trim();

  if (!trimmedEmail) {
    return '';
  }

  if (!trimmedName) {
    return trimmedEmail;
  }

  const escapedName = trimmedName.replace(/"/g, '\\"');
  return `"${escapedName}" <${trimmedEmail}>`;
}

function buildResendPayload({
  toEmail,
  toName,
  subject,
  htmlContent,
  textContent,
  fromEmail = DEFAULT_FROM_EMAIL,
  fromName = DEFAULT_FROM_NAME,
  replyTo,
  headers = {},
}) {
  const payload = {
    from: formatEmailAddress(fromEmail, fromName),
    to: [formatEmailAddress(toEmail, toName) || toEmail],
    subject,
    html: htmlContent,
  };

  if (textContent) {
    payload.text = textContent;
  }

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  if (headers && Object.keys(headers).length > 0) {
    payload.headers = headers;
  }

  return payload;
}

async function sendEmailViaResend(options) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const payload = buildResendPayload(options);

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || errorData.error || response.statusText || 'Failed to send email';
    throw new Error(`Resend error: ${message}`);
  }

  const data = await response.json();
  return { messageId: data.id };
}

module.exports = {
  DEFAULT_FROM_EMAIL,
  DEFAULT_FROM_NAME,
  buildResendPayload,
  formatEmailAddress,
  getResendApiKey,
  sendEmailViaResend,
};

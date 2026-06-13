import { DEFAULT_EMAIL_TEMPLATES } from './defaultEmailTemplates.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const serviceRoleHeaders = (prefer = '') => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  ...(prefer ? { Prefer: prefer } : {}),
});

async function templateExists(type) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/email_templates?type=eq.${encodeURIComponent(type)}&select=type&limit=1`,
    { headers: serviceRoleHeaders() }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check email template (${type}): ${errorText}`);
  }

  const records = await response.json();
  return records.length > 0;
}

async function insertTemplate(template) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/email_templates`, {
    method: 'POST',
    headers: serviceRoleHeaders('return=representation'),
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create email template (${template.type}): ${errorText}`);
  }

  const created = await response.json();
  return created[0] || created;
}

export async function ensureDefaultEmailTemplates() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const created = [];

  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    const exists = await templateExists(template.type);
    if (!exists) {
      const record = await insertTemplate(template);
      created.push(record.type || template.type);
    }
  }

  return { created };
}

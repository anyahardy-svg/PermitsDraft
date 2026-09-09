const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const serviceRoleHeaders = (prefer = '') => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  ...(prefer ? { Prefer: prefer } : {}),
});

function generateApprovalToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getTokenExpiryDate() {
  return new Date(Date.now() + TOKEN_TTL_MS).toISOString();
}

function getPublicAppOrigin(origin) {
  const fallback = (process.env.REACT_APP_BASE_URL || 'https://contractorhq.co.nz').replace(/\/$/, '');
  if (!origin) {
    return fallback;
  }
  try {
    const { hostname, protocol, host } = new URL(origin);
    if (hostname.includes('-kiosk.')) {
      return fallback;
    }
    return `${protocol}//${host}`.replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function buildApprovalPageUrl(token, baseUrl) {
  const origin = getPublicAppOrigin(baseUrl);
  return `${origin}/approve-accreditation?token=${encodeURIComponent(token)}`;
}

async function invalidateStageTokens(companyId, stage) {
  const now = new Date().toISOString();
  await fetch(
    `${SUPABASE_URL}/rest/v1/accreditation_approval_tokens?company_id=eq.${companyId}&stage=eq.${encodeURIComponent(stage)}&used_at=is.null`,
    {
      method: 'PATCH',
      headers: serviceRoleHeaders(),
      body: JSON.stringify({ used_at: now }),
    }
  );
}

async function issueApprovalToken(companyId, stage) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role is not configured on the server');
  }

  await invalidateStageTokens(companyId, stage);

  const token = generateApprovalToken();
  const expiresAt = getTokenExpiryDate();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/accreditation_approval_tokens`, {
    method: 'POST',
    headers: serviceRoleHeaders('return=representation'),
    body: JSON.stringify({
      company_id: companyId,
      stage,
      token,
      expires_at: expiresAt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to issue approval token: ${errorText}`);
  }

  const records = await response.json();
  const record = Array.isArray(records) ? records[0] : records;
  return { token: record.token, expiresAt: record.expires_at };
}

async function getApprovalTokenRecord(token) {
  if (!token || typeof token !== 'string') {
    return { error: 'Token is required', status: 400 };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Supabase service role is not configured on the server', status: 500 };
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/accreditation_approval_tokens?token=eq.${encodeURIComponent(token)}&select=*&limit=1`,
    { headers: serviceRoleHeaders() }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `Failed to validate token: ${errorText}`, status: response.status };
  }

  const records = await response.json();
  const record = records[0];
  if (!record) {
    return { error: 'Invalid or expired approval link', status: 401 };
  }

  if (record.used_at) {
    return { error: 'This approval link has already been used', status: 401 };
  }

  const expiresAt = new Date(record.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return { error: 'This approval link has expired. Please contact support for a new link.', status: 401 };
  }

  return { record };
}

async function markTokenUsed(token) {
  const now = new Date().toISOString();
  await fetch(
    `${SUPABASE_URL}/rest/v1/accreditation_approval_tokens?token=eq.${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
      headers: serviceRoleHeaders(),
      body: JSON.stringify({ used_at: now }),
    }
  );
}

module.exports = {
  TOKEN_TTL_MS,
  buildApprovalPageUrl,
  getApprovalTokenRecord,
  issueApprovalToken,
  markTokenUsed,
};

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const serviceRoleHeaders = (prefer = '') => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  ...(prefer ? { Prefer: prefer } : {}),
});

export function generateSupplierAccreditationToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function getSupplierTokenExpiryDate() {
  return new Date(Date.now() + TOKEN_TTL_MS).toISOString();
}

export function getSupplierAccreditationFormUrl(token, baseUrl) {
  const origin = baseUrl || process.env.REACT_APP_BASE_URL || 'https://contractorhq.co.nz';
  return `${origin.replace(/\/$/, '')}/supplier-form?token=${encodeURIComponent(token)}`;
}

export async function issueSupplierAccreditationToken(supplierId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const token = generateSupplierAccreditationToken();
  const expiresAt = getSupplierTokenExpiryDate();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}`, {
    method: 'PATCH',
    headers: serviceRoleHeaders('return=representation'),
    body: JSON.stringify({
      accreditation_token: token,
      accreditation_token_expires_at: expiresAt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to issue supplier token: ${errorText}`);
  }

  return { token, expiresAt };
}

export async function getSupplierByAccreditationToken(token) {
  if (!token || typeof token !== 'string') {
    return { error: 'Token is required', status: 400 };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Supabase service role is not configured on the server', status: 500 };
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/suppliers?accreditation_token=eq.${encodeURIComponent(token)}&select=*&limit=1`,
    {
      headers: serviceRoleHeaders(''),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `Failed to validate token: ${errorText}`, status: response.status };
  }

  const suppliers = await response.json();
  const supplier = suppliers[0];

  if (!supplier) {
    return { error: 'Invalid or expired accreditation link', status: 401 };
  }

  if (supplier.accreditation_token_expires_at) {
    const expiresAt = new Date(supplier.accreditation_token_expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return { error: 'This accreditation link has expired. Please contact us for a new invitation.', status: 401 };
    }
  }

  return { supplier };
}

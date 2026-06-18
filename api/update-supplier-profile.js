const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const serviceRoleHeaders = (prefer = '') => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  ...(prefer ? { Prefer: prefer } : {}),
});

const SUPPLIER_PROFILE_FIELDS = [
  'company_name',
  'company_email',
  'tech_contact_name',
  'contact_phone',
  'nzbn',
  'address_1',
  'address_city',
  'address_postcode',
  'contact_email',
];

function buildSupplierProfilePayload(formData) {
  const payload = {};

  SUPPLIER_PROFILE_FIELDS.forEach((field) => {
    if (formData[field] !== undefined) {
      const value = formData[field];
      payload[field] = typeof value === 'string' ? value.trim() || null : value;
    }
  });

  return payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase service role is not configured on the server' });
  }

  const { supplierId, formData } = req.body || {};

  if (!supplierId) {
    return res.status(400).json({ error: 'supplierId is required' });
  }

  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'formData is required' });
  }

  const payload = buildSupplierProfilePayload(formData);
  if (!Object.keys(payload).length) {
    return res.status(200).json({ success: true });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}`, {
      method: 'PATCH',
      headers: serviceRoleHeaders('return=representation'),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update supplier profile:', errorText);
      return res.status(response.status).json({ error: 'Failed to update supplier profile' });
    }

    const updated = await response.json();
    return res.status(200).json(updated[0] || updated);
  } catch (error) {
    console.error('update-supplier-profile error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update supplier profile' });
  }
}

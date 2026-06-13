import { getSupplierByAccreditationToken } from './lib/supplierToken.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_SYSTEM_USER_ID = process.env.SUPABASE_SYSTEM_USER_ID;

const serviceRoleHeaders = (prefer = 'return=representation') => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: prefer,
});

const SUPPLIER_PROFILE_FIELDS = [
  'company_name',
  'company_email',
  'tech_contact_name',
  'contact_surname',
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

async function saveSupplierProfile(supplierId, formData) {
  const payload = buildSupplierProfilePayload(formData);
  if (!Object.keys(payload).length) {
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}`, {
    method: 'PATCH',
    headers: serviceRoleHeaders(''),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update supplier profile: ${errorText}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Supabase service role is not configured on the server',
    });
  }

  const { token, formData, status = 'draft' } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'formData is required' });
  }

  try {
    const result = await getSupplierByAccreditationToken(token);

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const { supplier } = result;
    const supplierId = supplier.id;

    await saveSupplierProfile(supplierId, formData);

    const existingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/supplier_accreditations?supplier_id=eq.${supplierId}&select=id,submitted_by&order=updated_at.desc&limit=1`,
      { headers: serviceRoleHeaders('') }
    );

    if (!existingResponse.ok) {
      const errorText = await existingResponse.text();
      console.error('Failed to look up supplier accreditation:', errorText);
      return res.status(existingResponse.status).json({ error: 'Failed to look up supplier accreditation' });
    }

    const existingRecords = await existingResponse.json();
    const existing = existingRecords[0];

    if (existing?.id) {
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/supplier_accreditations?id=eq.${existing.id}`,
        {
          method: 'PATCH',
          headers: serviceRoleHeaders(),
          body: JSON.stringify({
            accreditation_data: formData,
            status,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Failed to update supplier accreditation:', errorText);
        return res.status(updateResponse.status).json({ error: 'Failed to update supplier accreditation' });
      }

      const updated = await updateResponse.json();
      return res.status(200).json(updated[0] || updated);
    }

    const submittedBy = SUPABASE_SYSTEM_USER_ID;
    if (!submittedBy) {
      return res.status(500).json({
        error: 'No existing accreditation record found and SUPABASE_SYSTEM_USER_ID is not configured',
      });
    }

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/supplier_accreditations`, {
      method: 'POST',
      headers: serviceRoleHeaders(),
      body: JSON.stringify({
        supplier_id: supplierId,
        accreditation_data: formData,
        status,
        submitted_by: submittedBy,
      }),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Failed to create supplier accreditation:', errorText);
      return res.status(insertResponse.status).json({ error: 'Failed to create supplier accreditation' });
    }

    const created = await insertResponse.json();
    return res.status(200).json(created[0] || created);
  } catch (error) {
    console.error('save-supplier-accreditation-by-token error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save supplier accreditation' });
  }
}

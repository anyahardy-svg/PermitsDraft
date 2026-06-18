const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_SYSTEM_USER_ID = process.env.SUPABASE_SYSTEM_USER_ID || null;

export const SUPPLIER_PROFILE_FIELDS = [
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

export function buildSupplierProfilePayload(formData) {
  const payload = {};

  SUPPLIER_PROFILE_FIELDS.forEach((field) => {
    if (formData[field] !== undefined) {
      const value = formData[field];
      payload[field] = typeof value === 'string' ? value.trim() || null : value;
    }
  });

  return payload;
}

function serviceRoleHeaders(prefer = 'return=representation') {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

export async function saveSupplierProfile(supplierId, formData) {
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

function buildFormRecordInsertPayload(supplierId, formData, status) {
  const payload = {
    supplier_id: supplierId,
    accreditation_data: formData,
    status,
  };

  if (SUPABASE_SYSTEM_USER_ID) {
    payload.submitted_by = SUPABASE_SYSTEM_USER_ID;
  }

  return payload;
}

/**
 * Persist supplier questionnaire data against the supplier record.
 * Profile fields go to suppliers; full form payload goes to supplier_accreditations.
 */
export async function saveSupplierFormData(supplierId, formData, status = 'draft') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role is not configured on the server');
  }

  await saveSupplierProfile(supplierId, formData);

  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/supplier_accreditations?supplier_id=eq.${supplierId}&select=id&order=updated_at.desc&limit=1`,
    { headers: serviceRoleHeaders('') }
  );

  if (!existingResponse.ok) {
    const errorText = await existingResponse.text();
    throw new Error(`Failed to look up supplier form data: ${errorText}`);
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
      throw new Error(`Failed to update supplier form data: ${errorText}`);
    }

    const updated = await updateResponse.json();
    return updated[0] || updated;
  }

  const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/supplier_accreditations`, {
    method: 'POST',
    headers: serviceRoleHeaders(),
    body: JSON.stringify(buildFormRecordInsertPayload(supplierId, formData, status)),
  });

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    if (errorText.includes('submitted_by') || errorText.includes('null value')) {
      throw new Error(
        'Failed to save supplier form data. Run migrations/make-supplier-accreditation-submitted-by-nullable.sql in Supabase.'
      );
    }
    throw new Error(`Failed to save supplier form data: ${errorText}`);
  }

  const created = await insertResponse.json();
  return created[0] || created;
}

/**
 * Ensure a draft form record exists when a supplier is first created.
 */
export async function ensureSupplierFormRecord(supplierId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !supplierId) {
    return null;
  }

  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/supplier_accreditations?supplier_id=eq.${supplierId}&select=id&limit=1`,
    { headers: serviceRoleHeaders('') }
  );

  if (!existingResponse.ok) {
    return null;
  }

  const existingRecords = await existingResponse.json();
  if (existingRecords[0]?.id) {
    return existingRecords[0];
  }

  const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/supplier_accreditations`, {
    method: 'POST',
    headers: serviceRoleHeaders(),
    body: JSON.stringify(buildFormRecordInsertPayload(supplierId, {}, 'draft')),
  });

  if (!insertResponse.ok) {
    return null;
  }

  const created = await insertResponse.json();
  return created[0] || created;
}

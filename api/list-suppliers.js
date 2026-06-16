/**
 * Backend endpoint to list suppliers using the service role key.
 * Bypasses RLS when the admin panel queries with the anon key.
 *
 * Usage: GET /api/list-suppliers
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

function serviceRoleHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function fetchLatestAccreditationStatuses(supplierIds = []) {
  if (!supplierIds.length) {
    return {};
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/supplier_accreditations?supplier_id=in.(${supplierIds.join(',')})&select=supplier_id,status,updated_at&order=updated_at.desc`,
    {
      headers: serviceRoleHeaders(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch supplier accreditations:', errorText);
    return {};
  }

  const records = await response.json();
  const statusBySupplierId = {};

  for (const record of records) {
    if (!statusBySupplierId[record.supplier_id]) {
      statusBySupplierId[record.supplier_id] = record.status;
    }
  }

  return statusBySupplierId;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Supabase service role is not configured on the server',
    });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/suppliers?select=id,company_name,risk_classification,status,created_at,contact_email,tech_contact_name,company_email,contact_surname,contact_phone,nzbn,address_1,address_city,address_postcode,invitation_sent_at,accreditation_deadline&order=company_name.asc`,
      {
        headers: serviceRoleHeaders(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch suppliers:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch suppliers' });
    }

    const suppliers = await response.json();
    const accreditationStatuses = await fetchLatestAccreditationStatuses(
      suppliers.map((supplier) => supplier.id)
    );

    const suppliersWithAccreditationStatus = suppliers.map((supplier) => ({
      ...supplier,
      accreditation_status: accreditationStatuses[supplier.id] || 'draft',
    }));

    return res.status(200).json(suppliersWithAccreditationStatus);
  } catch (error) {
    console.error('list-suppliers error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch suppliers' });
  }
}

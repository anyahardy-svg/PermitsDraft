import { getSupplierByAccreditationToken } from './lib/supplierToken.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const serviceRoleHeaders = () => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query?.token;

  try {
    const result = await getSupplierByAccreditationToken(token);

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const { supplier } = result;

    const accreditationResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/supplier_accreditations?supplier_id=eq.${supplier.id}&select=*&order=updated_at.desc&limit=1`,
      { headers: serviceRoleHeaders() }
    );

    if (!accreditationResponse.ok) {
      const errorText = await accreditationResponse.text();
      console.error('Failed to fetch supplier accreditation:', errorText);
      return res.status(accreditationResponse.status).json({ error: 'Failed to fetch supplier accreditation' });
    }

    const records = await accreditationResponse.json();

    return res.status(200).json({
      supplier,
      accreditation: records[0] || null,
    });
  } catch (error) {
    console.error('get-supplier-accreditation-by-token error:', error);
    return res.status(500).json({ error: error.message || 'Failed to load accreditation' });
  }
}

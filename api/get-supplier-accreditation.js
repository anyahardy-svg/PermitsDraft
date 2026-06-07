/**
 * Backend endpoint to fetch supplier accreditation data using the service role key.
 *
 * Usage: GET /api/get-supplier-accreditation?supplierId=<uuid>
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supplierId = req.query.supplierId;

  if (!supplierId) {
    return res.status(400).json({ error: 'supplierId is required' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Supabase service role is not configured on the server',
    });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/supplier_accreditations?supplier_id=eq.${supplierId}&select=*&order=updated_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch supplier accreditation:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch supplier accreditation' });
    }

    const records = await response.json();
    return res.status(200).json(records[0] || null);
  } catch (error) {
    console.error('get-supplier-accreditation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch supplier accreditation' });
  }
}

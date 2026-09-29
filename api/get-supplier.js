/**
 * Fetch a single supplier by ID using the service role key.
 *
 * Usage: GET /api/get-supplier?supplierId=<uuid>
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const SUPPLIER_SELECT =
  'id,company_name,risk_classification,status,created_at,contact_email,tech_contact_name,company_email,contact_phone,nzbn,address_1,address_city,address_postcode,invitation_sent_at,accreditation_deadline';

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
      `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}&select=${SUPPLIER_SELECT}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch supplier:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch supplier' });
    }

    const records = await response.json();
    return res.status(200).json(records[0] || null);
  } catch (error) {
    console.error('get-supplier error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch supplier' });
  }
}

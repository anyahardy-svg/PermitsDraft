/**
 * Backend endpoint to list suppliers using the service role key.
 * Bypasses RLS when the admin panel queries with the anon key.
 *
 * Usage: GET /api/list-suppliers
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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
      `${SUPABASE_URL}/rest/v1/suppliers?select=id,company_name,risk_classification,status,created_at,contact_email,tech_contact_name,invitation_sent_at,accreditation_deadline&order=company_name.asc`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch suppliers:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch suppliers' });
    }

    const suppliers = await response.json();
    return res.status(200).json(suppliers);
  } catch (error) {
    console.error('list-suppliers error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch suppliers' });
  }
}

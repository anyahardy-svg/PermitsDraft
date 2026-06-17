/**
 * Backend endpoint to delete a supplier using the service role key.
 * Allows the admin panel (custom auth) to remove suppliers and related records.
 *
 * Usage:
 *   POST /api/delete-supplier
 *   Body: { supplierId }
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

function serviceRoleHeaders(prefer = 'return=representation') {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
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

  const supplierId = req.body?.supplierId;

  if (!supplierId) {
    return res.status(400).json({ error: 'supplierId is required' });
  }

  try {
    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}`,
      {
        method: 'DELETE',
        headers: serviceRoleHeaders(),
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Failed to delete supplier:', errorText);
      return res.status(deleteResponse.status).json({ error: 'Failed to delete supplier' });
    }

    const deleted = await deleteResponse.json();

    return res.status(200).json({
      success: true,
      deleted: deleted[0] || null,
    });
  } catch (error) {
    console.error('delete-supplier error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete supplier' });
  }
}

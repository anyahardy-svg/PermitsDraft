/**
 * Public list of admin users who can be assigned as accreditation approvers for a site.
 *
 * POST /api/invite-company-approvers
 * Body: { siteId }
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Supabase service role is not configured on the server' });
  }

  try {
    const siteId = String(req.body?.siteId || '').trim();
    if (!siteId) {
      return res.status(400).json({ error: 'siteId is required' });
    }

    const { data: siteRow, error: siteError } = await admin
      .from('sites')
      .select('id, name')
      .eq('id', siteId)
      .maybeSingle();

    if (siteError) {
      throw siteError;
    }
    if (!siteRow) {
      return res.status(404).json({ error: 'Site not found' });
    }

    let { data, error } = await admin
      .from('admin_users')
      .select('id, email, name, role, site_ids')
      .contains('site_ids', [siteId])
      .order('name', { ascending: true });

    if (error?.message?.includes('site_ids')) {
      const retry = await admin
        .from('admin_users')
        .select('id, email, name, role')
        .order('name', { ascending: true });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw error;
    }

    const approvers = (data || [])
      .filter((row) => {
        const ids = row.site_ids;
        if (!Array.isArray(ids)) {
          return true;
        }
        return ids.includes(siteId);
      })
      .map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
      }));

    return res.status(200).json({
      success: true,
      siteId,
      siteName: siteRow.name,
      approvers,
    });
  } catch (err) {
    console.error('invite-company-approvers error:', err);
    return res.status(500).json({ error: err.message || 'Failed to load approvers' });
  }
};

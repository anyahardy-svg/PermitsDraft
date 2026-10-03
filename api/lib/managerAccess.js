const { getSupabaseAdmin } = require('../supabaseAdmin');

async function assertManagerAccess(requestingAdminId, siteId) {
  if (!requestingAdminId) {
    return { error: 'Manager admin session is required', status: 401 };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: 'Supabase service role is not configured on the server', status: 500 };
  }

  const { data: manager, error } = await admin
    .from('admin_users')
    .select('id, role, site_ids')
    .eq('id', requestingAdminId)
    .maybeSingle();

  if (error) {
    return { error: error.message, status: 500 };
  }
  if (!manager) {
    return { error: 'Invalid admin session', status: 403 };
  }

  const allowedSites = manager.site_ids;
  if (Array.isArray(allowedSites) && allowedSites.length > 0 && siteId) {
    if (!allowedSites.includes(siteId)) {
      return { error: 'You do not have access to this site', status: 403 };
    }
  }

  return { admin, manager };
}

module.exports = {
  assertManagerAccess,
};

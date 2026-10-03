const { getSupabaseAdmin } = require('../supabaseAdmin');

function normalizeSubdomain(value) {
  return String(value || '').trim().toLowerCase();
}

function isRelaxedKioskHost(hostname) {
  if (!hostname) {
    return true;
  }
  return hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('vercel.app');
}

/**
 * Ensure kiosk requests are scoped to a real site (optional subdomain match).
 */
async function assertKioskSiteAccess(siteId, kioskSubdomain, { hostname } = {}) {
  if (!siteId) {
    return { error: 'siteId is required', status: 400 };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: 'Supabase service role is not configured on the server', status: 500 };
  }

  const { data: site, error } = await admin
    .from('sites')
    .select('id, business_unit_id, kiosk_subdomain, name')
    .eq('id', siteId)
    .maybeSingle();

  if (error) {
    return { error: error.message, status: 500 };
  }
  if (!site) {
    return { error: 'Site not found', status: 404 };
  }

  const expectedSubdomain = normalizeSubdomain(site.kiosk_subdomain);
  const providedSubdomain = normalizeSubdomain(kioskSubdomain);

  if (
    expectedSubdomain
    && providedSubdomain
    && !isRelaxedKioskHost(hostname)
    && providedSubdomain !== expectedSubdomain
  ) {
    return { error: 'Kiosk site mismatch', status: 403 };
  }

  return { site, admin };
}

module.exports = {
  assertKioskSiteAccess,
  normalizeSubdomain,
  isRelaxedKioskHost,
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const KIOSK_BASE_DOMAIN = (
  process.env.CONTRACTOR_HQ_KIOSK_DOMAIN
  || process.env.VITE_CONTRACTOR_HQ_KIOSK_DOMAIN
  || 'contractorhq.co.nz'
).replace(/^\./, '');

const MAIN_APP_ORIGIN = (
  process.env.REACT_APP_BASE_URL
  || process.env.CONTRACTOR_HQ_ORIGIN
  || 'https://contractorhq.co.nz'
).replace(/\/$/, '');

const serviceRoleHeaders = () => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
});

function normalizeSiteIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.filter(Boolean).map((id) => String(id)))];
}

function buildKioskOrigin(kioskSubdomain) {
  const trimmed = String(kioskSubdomain || '').trim().replace(/\/$/, '');
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes('://')) {
    return trimmed.replace(/\/$/, '');
  }
  const host = trimmed.includes('.')
    ? trimmed
    : `${trimmed}.${KIOSK_BASE_DOMAIN}`;
  return `https://${host}`;
}

function pickKioskSubdomain(sites, preferredSiteIds = []) {
  const withKiosk = (sites || []).filter((site) => site?.kiosk_subdomain);
  if (!withKiosk.length) {
    return null;
  }

  const preferred = normalizeSiteIds(preferredSiteIds);
  if (preferred.length) {
    const match = withKiosk.find((site) => preferred.includes(String(site.id)));
    if (match?.kiosk_subdomain) {
      return match.kiosk_subdomain;
    }
  }

  return withKiosk[0].kiosk_subdomain;
}

async function fetchSitesByIds(siteIds) {
  const ids = normalizeSiteIds(siteIds);
  if (!ids.length || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const inList = ids.map((id) => encodeURIComponent(id)).join(',');
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sites?id=in.(${inList})&select=id,name,kiosk_subdomain`,
    { headers: serviceRoleHeaders() }
  );

  if (!response.ok) {
    console.warn('Failed to load sites for approval link:', await response.text());
    return [];
  }

  return response.json();
}

async function fetchAdminSiteIds(adminUserId) {
  if (!adminUserId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?id=eq.${adminUserId}&select=site_ids&limit=1`,
    { headers: serviceRoleHeaders() }
  );

  if (!response.ok) {
    console.warn('Failed to load admin site_ids for approval link:', await response.text());
    return [];
  }

  const records = await response.json();
  return normalizeSiteIds(records[0]?.site_ids);
}

/**
 * Deep link for approvers: kiosk admin host + company accreditation review modal.
 */
async function buildAdminAccreditationApprovalUrl({
  companyId,
  approverAdminUserId,
  companySiteIds = [],
  stage = null,
}) {
  if (!companyId) {
    throw new Error('companyId is required to build accreditation approval link');
  }

  const adminSiteIds = await fetchAdminSiteIds(approverAdminUserId);
  const companySites = normalizeSiteIds(companySiteIds);
  const siteIdsToLoad = [...new Set([...adminSiteIds, ...companySites])];
  const sites = await fetchSitesByIds(siteIdsToLoad);

  const sharedSiteIds = adminSiteIds.filter((id) => companySites.includes(id));
  const preferredSiteIds = sharedSiteIds.length
    ? sharedSiteIds
    : (adminSiteIds.length ? adminSiteIds : companySites);
  const kioskSubdomain = pickKioskSubdomain(sites, preferredSiteIds);

  const path = `/admin/companies/${companyId}/accreditation/`;
  const query = stage ? `?approvalStage=${encodeURIComponent(stage)}` : '';
  const origin = buildKioskOrigin(kioskSubdomain) || MAIN_APP_ORIGIN;

  return `${origin}${path}${query}`;
}

module.exports = {
  buildAdminAccreditationApprovalUrl,
  buildKioskOrigin,
  pickKioskSubdomain,
};

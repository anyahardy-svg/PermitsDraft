/**
 * Site-scoped contractor induction status (matches kiosk logic in KioskScreen.js).
 */
export function getSiteInductionStatus(contractor, siteId) {
  const siteIds = contractor.site_ids || contractor.siteIds || [];
  const onSite = Array.isArray(siteIds) && siteIds.includes(siteId);

  if (!onSite) {
    return 'not_on_site';
  }

  const expiryRaw = contractor.induction_expiry || contractor.inductionExpiry;
  if (!expiryRaw) {
    return 'not_inducted';
  }

  const expiry = new Date(expiryRaw);
  if (Number.isNaN(expiry.getTime())) {
    return 'not_inducted';
  }

  if (expiry < new Date()) {
    return 'expired';
  }

  return 'inducted';
}

export function formatInductionExpiry(expiryRaw) {
  if (!expiryRaw) {
    return '—';
  }

  const date = new Date(expiryRaw);
  if (Number.isNaN(date.getTime())) {
    return String(expiryRaw);
  }

  return date.toLocaleDateString('en-NZ');
}

export function getOtherSiteNames(contractor, currentSiteId, siteIdToName) {
  const siteIds = contractor.site_ids || contractor.siteIds || [];
  return siteIds
    .filter((id) => id !== currentSiteId)
    .map((id) => siteIdToName[id] || id)
    .filter(Boolean);
}

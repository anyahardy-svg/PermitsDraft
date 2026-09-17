export const INDUCTION_EXPIRING_SOON_DAYS = 30;

function getSiteInductionRecord(contractor, siteId) {
  const map = contractor?.site_inductions || contractor?.siteInductions;
  if (map && map[siteId]) {
    return map[siteId];
  }

  const records = contractor?.site_induction_records || contractor?.siteInductionRecords || [];
  return records.find((record) => record.site_id === siteId) || null;
}

function hasPerSiteInductionRecords(contractor) {
  const map = contractor?.site_inductions || contractor?.siteInductions;
  if (map && Object.keys(map).length > 0) {
    return true;
  }

  const records = contractor?.site_induction_records || contractor?.siteInductionRecords || [];
  return records.length > 0;
}

function getExpiryStatus(expiryRaw) {
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

/**
 * Site-scoped contractor induction status.
 * Prefers per-site contractor_inductions records when present.
 */
export function getSiteInductionStatus(contractor, siteId) {
  const siteIds = contractor.site_ids || contractor.siteIds || [];
  const onSite = Array.isArray(siteIds) && siteIds.includes(siteId);

  if (!onSite) {
    return 'not_on_site';
  }

  const siteInduction = getSiteInductionRecord(contractor, siteId);
  if (siteInduction) {
    return getExpiryStatus(siteInduction.expires_at || siteInduction.expiresAt);
  }

  if (hasPerSiteInductionRecords(contractor)) {
    return 'not_inducted';
  }

  const expiryRaw = contractor.induction_expiry || contractor.inductionExpiry;
  return getExpiryStatus(expiryRaw);
}

export function getSiteInductionExpiry(contractor, siteId) {
  const siteInduction = getSiteInductionRecord(contractor, siteId);
  if (siteInduction?.expires_at || siteInduction?.expiresAt) {
    return siteInduction.expires_at || siteInduction.expiresAt;
  }

  if (hasPerSiteInductionRecords(contractor)) {
    return null;
  }

  return contractor.induction_expiry || contractor.inductionExpiry || null;
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
  const siteInductionMap = contractor?.site_inductions || contractor?.siteInductions || {};

  return siteIds
    .filter((id) => id !== currentSiteId)
    .filter((id) => {
      const record = siteInductionMap[id];
      if (record) {
        return getExpiryStatus(record.expires_at || record.expiresAt) === 'inducted';
      }
      if (hasPerSiteInductionRecords(contractor)) {
        return false;
      }
      return getExpiryStatus(contractor.induction_expiry || contractor.inductionExpiry) === 'inducted';
    })
    .map((id) => siteIdToName[id] || id)
    .filter(Boolean);
}

export function isExpiringWithinDays(contractor, siteId, days = INDUCTION_EXPIRING_SOON_DAYS) {
  if (getSiteInductionStatus(contractor, siteId) !== 'inducted') {
    return false;
  }

  const expiryRaw = getSiteInductionExpiry(contractor, siteId);
  if (!expiryRaw) {
    return false;
  }

  const expiry = new Date(expiryRaw);
  if (Number.isNaN(expiry.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  expiry.setHours(0, 0, 0, 0);

  return expiry <= cutoff;
}

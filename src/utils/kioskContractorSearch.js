import { getSiteInductionStatus, isInductedAnywhere } from './siteInductionStatus';

/**
 * Kiosk sign-in search / roster: site-assigned, inducted at this site, or inducted at any site.
 */
export function contractorMatchesKioskSignInSearch(contractor, siteId) {
  if (!contractor || !siteId) {
    return false;
  }

  const siteIds = contractor.site_ids || contractor.siteIds || [];
  const onSite = Array.isArray(siteIds) && siteIds.some((id) => String(id) === String(siteId));
  if (onSite) {
    return true;
  }

  const statusHere = getSiteInductionStatus(contractor, siteId);
  if (statusHere === 'inducted' || statusHere === 'expired') {
    return true;
  }

  return isInductedAnywhere(contractor);
}

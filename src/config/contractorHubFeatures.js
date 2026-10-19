/**
 * Permit-to-work (JSEA / permits / drafts) and join-request hub areas.
 * Set to true when ready to expose on contractorhq.co.nz again.
 */
export const CONTRACTOR_HUB_PTOW_ENABLED = false;

export const DISABLED_CONTRACTOR_ADMIN_TABS_WHEN_PTOW_OFF = [
  'jsea',
  'permits',
  'my-permits',
  'join-requests',
];

export function isContractorAdminTabEnabled(tab) {
  if (!tab) {
    return true;
  }
  if (CONTRACTOR_HUB_PTOW_ENABLED) {
    return true;
  }
  return !DISABLED_CONTRACTOR_ADMIN_TABS_WHEN_PTOW_OFF.includes(tab);
}

export function normalizeContractorAdminTab(tab) {
  return isContractorAdminTabEnabled(tab) ? tab : null;
}

import { getEmailAssetPublicUrl } from '../constants/emailBrandAssets';

/**
 * Maps kiosk subdomain prefix (first segment before '-') to logo file in email-assets.
 * e.g. wa-hunua-quarry-kiosk → WA-logo.jpg, firth-... → Firth-logo.jpg
 */
export const KIOSK_PREFIX_LOGO_FILES = {
  wa: 'WA-logo.jpg',
  firth: 'Firth-logo.jpg',
  ral: 'RAL-logo.jpg',
  rasl: 'RASL-logo.jpg',
  rha: 'RHA-logo.jpg',
  tuq: 'TUQ-logo.jpg',
};

/**
 * Extract the brand prefix from a kiosk subdomain.
 * @param {string} kioskSubdomain - e.g. "wa-hunua-quarry-kiosk"
 * @returns {string|null}
 */
export function getKioskSubdomainPrefix(kioskSubdomain) {
  if (!kioskSubdomain || typeof kioskSubdomain !== 'string') {
    return null;
  }

  const prefix = kioskSubdomain.split('-')[0]?.trim();
  return prefix ? prefix.toLowerCase() : null;
}

/**
 * Resolve the brand logo URL for a kiosk subdomain.
 * @param {string} kioskSubdomain
 * @returns {string|null}
 */
export function getKioskLogoUrl(kioskSubdomain) {
  const prefix = getKioskSubdomainPrefix(kioskSubdomain);
  if (!prefix) {
    return null;
  }

  const logoFile = KIOSK_PREFIX_LOGO_FILES[prefix];
  return logoFile ? getEmailAssetPublicUrl(logoFile) : null;
}

/**
 * Resolve logo metadata for display (name + url).
 * @param {string} kioskSubdomain
 * @returns {{ name: string, url: string }|null}
 */
export function getKioskLogo(kioskSubdomain) {
  const prefix = getKioskSubdomainPrefix(kioskSubdomain);
  if (!prefix) {
    return null;
  }

  const logoFile = KIOSK_PREFIX_LOGO_FILES[prefix];
  const url = logoFile ? getEmailAssetPublicUrl(logoFile) : null;
  if (!url) {
    return null;
  }

  return {
    name: prefix.toUpperCase(),
    url,
  };
}

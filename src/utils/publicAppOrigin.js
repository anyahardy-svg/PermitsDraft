import { isKioskSubdomain } from './inductionLinks';

export const CONTRACTOR_HQ_ORIGIN = 'https://contractorhq.co.nz';

function getConfiguredFallbackOrigin() {
  const configured = typeof process !== 'undefined' ? process.env?.REACT_APP_BASE_URL : null;
  return (configured || CONTRACTOR_HQ_ORIGIN).replace(/\/$/, '');
}

/**
 * Shareable external links should use the main app origin, not a site kiosk subdomain.
 */
export function getPublicAppOrigin(origin) {
  const fallback = getConfiguredFallbackOrigin();

  if (!origin) {
    if (typeof window !== 'undefined') {
      return getPublicAppOrigin(window.location.origin);
    }
    return fallback;
  }

  try {
    const { hostname, protocol, host } = new URL(origin);
    if (isKioskSubdomain(hostname)) {
      return fallback;
    }
    return `${protocol}//${host}`.replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

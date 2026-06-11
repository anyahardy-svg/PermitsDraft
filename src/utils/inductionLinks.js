export const INDUCTION_ROUTE_PATHS = [
  '/inductions',
  '/inductions/',
  '/inductions/new',
  '/inductions/new/',
  '/inductions/returning',
  '/inductions/returning/',
  '/inductions/resume',
  '/inductions/resume/',
];

export function isInductionRoutePath(pathname) {
  return INDUCTION_ROUTE_PATHS.includes(pathname);
}

export function isKioskSubdomain(hostname = '') {
  return hostname.includes('-kiosk.');
}

export function isStandaloneInductionRoute(hostname, pathname) {
  return isInductionRoutePath(pathname) && !isKioskSubdomain(hostname);
}

export function getRouteFromInductionPath(pathname) {
  if (pathname === '/inductions/new' || pathname === '/inductions/new/') {
    return 'new';
  }
  if (pathname === '/inductions/returning' || pathname === '/inductions/returning/') {
    return 'returning';
  }
  if (pathname === '/inductions/resume' || pathname === '/inductions/resume/') {
    return 'resume';
  }
  return null;
}

export function inductionRouteToPath(route) {
  if (route === 'new') {
    return '/inductions/new/';
  }
  if (route === 'returning') {
    return '/inductions/returning/';
  }
  if (route === 'resume') {
    return '/inductions/resume/';
  }
  return '/inductions/';
}

export function getContractorInductionUrl(subPath = '/inductions/') {
  const normalizedSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalizedSubPath}`;
  }
  return `https://contractorhq.co.nz${normalizedSubPath}`;
}

export async function copyContractorInductionLink(subPath = '/inductions/') {
  const url = getContractorInductionUrl(subPath);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return url;
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return url;
  }

  return url;
}

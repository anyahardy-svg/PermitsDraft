const KIOSK_ROUTE_PATHS = new Set([
  '/sign-in-visitor',
  '/sign-in-visitor/',
  '/sign-out',
  '/sign-out/',
  '/inductions',
  '/inductions/',
  '/inductions/new',
  '/inductions/new/',
  '/inductions/returning',
  '/inductions/returning/',
  '/inductions/resume',
  '/inductions/resume/',
  '/inductions/add-parts',
  '/inductions/add-parts/',
  '/sign-in-contractor',
  '/sign-in-contractor/',
]);

const SUPPLIER_FORM_ROUTES = new Set([
  '/supplier-form',
  '/supplier-form/',
  '/supplier-accreditation',
  '/supplier-accreditation/',
]);

const ACCREDITATION_APPROVAL_ROUTES = new Set([
  '/approve-accreditation',
  '/approve-accreditation/',
]);

function isSupplierFormRoute(pathname) {
  return SUPPLIER_FORM_ROUTES.has(pathname);
}

function isAccreditationApprovalRoute(pathname) {
  return ACCREDITATION_APPROVAL_ROUTES.has(pathname);
}

function isKioskSubdomain(hostname = '') {
  return hostname.includes('-kiosk.');
}

function isStandaloneInductionRoute(hostname, pathname) {
  return KIOSK_ROUTE_PATHS.has(pathname)
    && pathname.startsWith('/inductions')
    && !isKioskSubdomain(hostname);
}

export function shouldBootKioskApp() {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const fullUrl = window.location.href;

  const hasAdminRoute = pathname === '/admin'
    || pathname === '/admin/'
    || pathname === '/manager'
    || pathname === '/manager/'
    || pathname.includes('/admin/')
    || pathname.startsWith('/contractor-admin')
    || isSupplierFormRoute(pathname)
    || isAccreditationApprovalRoute(pathname);
  const isContractorHub = hostname === 'contractorhq.co.nz' || hostname === 'www.contractorhq.co.nz';
  const isContractorAuthRoute = pathname.startsWith('/sign-in-contractor')
    || pathname.startsWith('/auth/callback');

  if (hasAdminRoute || (isContractorHub && isContractorAuthRoute)) {
    return false;
  }

  if (isStandaloneInductionRoute(hostname, pathname)) {
    return false;
  }

  const isKioskRoute = KIOSK_ROUTE_PATHS.has(pathname);
  const testMode = fullUrl.includes('mode=kiosk');

  return isKioskSubdomain(hostname) || testMode || isKioskRoute;
}

export function getKioskInitialRoute() {
  if (typeof window === 'undefined') {
    return null;
  }

  const pathname = window.location.pathname;
  if (pathname === '/sign-in-contractor' || pathname === '/sign-in-contractor/') {
    return 'contractor-signin';
  }
  if (pathname === '/sign-in-visitor' || pathname === '/sign-in-visitor/') {
    return 'visitor-induction';
  }
  if (pathname === '/sign-out' || pathname === '/sign-out/') {
    return 'signout';
  }
  if (pathname === '/inductions' || pathname === '/inductions/') {
    return 'inductions';
  }
  if (pathname === '/inductions/new' || pathname === '/inductions/new/') {
    return 'inductions-new';
  }
  if (pathname === '/inductions/returning' || pathname === '/inductions/returning/') {
    return 'inductions-returning';
  }
  if (pathname === '/inductions/resume' || pathname === '/inductions/resume/') {
    return 'inductions-resume';
  }
  if (pathname === '/inductions/add-parts' || pathname === '/inductions/add-parts/') {
    return 'inductions-add-parts';
  }

  return null;
}

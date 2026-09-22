import { getPublicAppOrigin } from './publicAppOrigin';

export const ACCREDITATION_APPROVAL_PATH = '/approve-accreditation';

const APPROVAL_ROUTES = new Set([
  '/approve-accreditation',
  '/approve-accreditation/',
]);

export function isAccreditationApprovalRoute(pathname) {
  return APPROVAL_ROUTES.has(pathname);
}

/** Admin modal deep link from approval emails (kiosk or main host). */
export function isCompanyAccreditationAdminPath(pathname) {
  if (!pathname) {
    return false;
  }
  return /^\/admin\/companies\/[^/]+\/accreditation\/?$/.test(pathname);
}

export function buildAccreditationApprovalUrl(token, baseUrl) {
  const origin = getPublicAppOrigin(baseUrl || (
    typeof window !== 'undefined' ? window.location.origin : undefined
  ));
  return `${origin}${ACCREDITATION_APPROVAL_PATH}?token=${encodeURIComponent(token)}`;
}

export function getInitialAccreditationApprovalToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!isAccreditationApprovalRoute(window.location.pathname)) {
    return null;
  }
  return new URLSearchParams(window.location.search).get('token');
}

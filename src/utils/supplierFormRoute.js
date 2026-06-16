import { getPublicAppOrigin } from './publicAppOrigin';

export const SUPPLIER_FORM_PATH = '/supplier-form';

const SUPPLIER_FORM_ROUTES = new Set([
  '/supplier-form',
  '/supplier-form/',
  '/supplier-accreditation',
  '/supplier-accreditation/',
]);

export function isSupplierFormRoute(pathname) {
  return SUPPLIER_FORM_ROUTES.has(pathname);
}

export function buildSupplierFormUrl(token, baseUrl) {
  const origin = getPublicAppOrigin(baseUrl || (
    typeof window !== 'undefined' ? window.location.origin : undefined
  ));

  return `${origin}${SUPPLIER_FORM_PATH}?token=${encodeURIComponent(token)}`;
}

export function redirectKioskSupplierFormIfNeeded() {
  if (typeof window === 'undefined') {
    return;
  }

  const { hostname, pathname, search } = window.location;
  if (!isSupplierFormRoute(pathname)) {
    return;
  }

  const publicOrigin = getPublicAppOrigin(window.location.origin);
  if (publicOrigin === window.location.origin.replace(/\/$/, '')) {
    return;
  }

  window.location.replace(`${publicOrigin}${pathname}${search}`);
}

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
  const origin = (baseUrl || (
    typeof window !== 'undefined' ? window.location.origin : 'https://contractorhq.co.nz'
  )).replace(/\/$/, '');

  return `${origin}${SUPPLIER_FORM_PATH}?token=${encodeURIComponent(token)}`;
}

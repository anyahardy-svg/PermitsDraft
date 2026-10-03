import { getPublicAppOrigin } from './publicAppOrigin';

export const INVITE_COMPANY_PATH = '/invite-company';

const INVITE_COMPANY_ROUTES = new Set([
  '/invite-company',
  '/invite-company/',
]);

const MANAGER_INVITE_COMPANY_ROUTES = new Set([
  '/manager/invite-company',
  '/manager/invite-company/',
]);

export function isInviteCompanyRoute(pathname) {
  return INVITE_COMPANY_ROUTES.has(pathname);
}

export function isManagerInviteCompanyRoute(pathname) {
  return MANAGER_INVITE_COMPANY_ROUTES.has(pathname);
}

export function buildInviteCompanyUrl({ siteId, baseUrl } = {}) {
  const origin = getPublicAppOrigin(
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : undefined),
  );
  const params = new URLSearchParams();
  if (siteId) {
    params.set('siteId', siteId);
  }
  const query = params.toString();
  return `${origin}${INVITE_COMPANY_PATH}/${query ? `?${query}` : ''}`;
}

export function parseInviteCompanySiteId(search = '') {
  if (!search) {
    return null;
  }
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('siteId');
  return raw && String(raw).trim() ? String(raw).trim() : null;
}

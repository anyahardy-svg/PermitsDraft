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

function trimParam(value) {
  const text = value != null ? String(value).trim() : '';
  return text || null;
}

/**
 * Parse query params from a public invite-company link.
 */
export function parseInviteCompanyLinkParams(search = '') {
  if (!search) {
    return {
      siteId: null,
      assignedManagerId: null,
      assignedHsPersonId: null,
      assignedManagerName: null,
      assignedHsPersonName: null,
    };
  }

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  return {
    siteId: trimParam(params.get('siteId')),
    assignedManagerId: trimParam(params.get('managerId') || params.get('assignedManagerId')),
    assignedHsPersonId: trimParam(params.get('hsPersonId') || params.get('assignedHsPersonId')),
    assignedManagerName: trimParam(params.get('managerName') || params.get('assignedManagerName')),
    assignedHsPersonName: trimParam(params.get('hsPersonName') || params.get('assignedHsPersonName')),
  };
}

/** @deprecated Use parseInviteCompanyLinkParams */
export function parseInviteCompanySiteId(search = '') {
  return parseInviteCompanyLinkParams(search).siteId;
}

export function buildInviteCompanyUrl({
  siteId,
  assignedManagerId,
  assignedHsPersonId,
  assignedManagerName,
  assignedHsPersonName,
  baseUrl,
} = {}) {
  const origin = getPublicAppOrigin(
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : undefined),
  );
  const params = new URLSearchParams();
  if (siteId) {
    params.set('siteId', siteId);
  }
  if (assignedManagerId) {
    params.set('managerId', assignedManagerId);
    if (assignedManagerName) {
      params.set('managerName', assignedManagerName);
    }
  }
  if (assignedHsPersonId) {
    params.set('hsPersonId', assignedHsPersonId);
    if (assignedHsPersonName) {
      params.set('hsPersonName', assignedHsPersonName);
    }
  }
  const query = params.toString();
  return `${origin}${INVITE_COMPANY_PATH}/${query ? `?${query}` : ''}`;
}

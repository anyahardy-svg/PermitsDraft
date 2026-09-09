import { getPublicAppOrigin } from './publicAppOrigin';

export function readAdminInviteParamsFromUrl(urlLike) {
  if (typeof window === 'undefined' && !urlLike) {
    return { isInvite: false, email: '', role: null };
  }

  const search = urlLike
    ? new URL(urlLike, 'https://contractorhq.co.nz').search
    : window.location.search;
  const params = new URLSearchParams(search);
  const isInvite = params.get('type') === 'invited';
  const rawEmail = params.get('email');
  const email = rawEmail ? decodeURIComponent(rawEmail).trim() : '';
  const role = params.get('role');

  return {
    isInvite,
    email,
    role: role === 'manager' || role === 'super_admin' ? role : null,
  };
}

export function getAdminInvitePath(role = 'manager') {
  return role === 'manager' ? '/manager' : '/admin';
}

export function buildAdminPasswordSetupUrl(email, role = 'manager', origin) {
  const base = getPublicAppOrigin(
    origin || (typeof window !== 'undefined' ? window.location.origin : undefined)
  );
  const path = getAdminInvitePath(role);
  const params = new URLSearchParams({
    type: 'invited',
    email: email.trim(),
    role,
  });

  return `${base}${path}?${params.toString()}`;
}

export function resolveAdminInviteRedirectUrl(urlLike) {
  const url = new URL(urlLike, 'https://contractorhq.co.nz');
  const { isInvite, email, role } = readAdminInviteParamsFromUrl(urlLike);

  if (!isInvite || url.pathname.startsWith('/sign-in-contractor')) {
    return null;
  }

  const alreadyOnAdminInvitePath =
    url.pathname === '/admin'
    || url.pathname === '/admin/'
    || url.pathname === '/manager'
    || url.pathname === '/manager/';

  if (alreadyOnAdminInvitePath) {
    return null;
  }

  const origin = getPublicAppOrigin(url.origin);
  const path = getAdminInvitePath(role || 'manager');
  const params = new URLSearchParams({ type: 'invited' });
  if (email) {
    params.set('email', email);
  }
  if (role) {
    params.set('role', role);
  }

  return `${origin}${path}?${params.toString()}`;
}

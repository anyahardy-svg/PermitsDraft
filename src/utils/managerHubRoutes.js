export function isManagerHubPath(pathname) {
  return pathname === '/manager' || pathname === '/manager/' || pathname.startsWith('/manager/');
}

export function isAdminPanelPath(pathname) {
  if (!pathname) {
    return false;
  }
  if (pathname.includes('/reset-password')) {
    return false;
  }
  return pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/');
}

function isCompanyAccreditationAdminPath(pathname) {
  if (!pathname) {
    return false;
  }
  return /^\/admin\/companies\/[^/]+\/accreditation\/?$/.test(pathname);
}

export function getPostAdminLoginScreen(adminData, pathname) {
  if (adminData?.role === 'manager') {
    if (isCompanyAccreditationAdminPath(pathname)) {
      return 'manage_companies';
    }
    return 'manager_hub';
  }
  if (isManagerHubPath(pathname)) {
    return 'manager_hub';
  }
  return 'admin';
}

export function getScreenPath(screen) {
  if (screen === 'manager_hub') {
    return '/manager/';
  }
  return null;
}

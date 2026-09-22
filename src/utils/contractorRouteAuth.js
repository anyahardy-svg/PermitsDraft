/**
 * Whether the App-level "Authentication Required" gate should block contractor-admin routes.
 * Keeps sign-in and hub bootstrap from fighting each other (redirect loop).
 */
export function shouldShowContractorAuthGuard({
  pathname = '',
  selectedCompanyId,
  currentScreen,
  contractorHubAuthChecked,
}) {
  if (!pathname.startsWith('/contractor-admin')) {
    return false;
  }

  if (!contractorHubAuthChecked) {
    return false;
  }

  if (selectedCompanyId) {
    return false;
  }

  if (currentScreen === 'contractorAuth') {
    return false;
  }

  return true;
}

export function contractorSignInPath() {
  return '/sign-in-contractor/';
}

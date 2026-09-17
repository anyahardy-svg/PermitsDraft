const KIOSK_RELOAD_RESUME_KEY = 'kiosk_reload_resume';

export function reloadKioskPage() {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function reloadKioskToSignIn({ contractorId, contractorName, fromInduction = true }) {
  if (typeof window === 'undefined') {
    return;
  }

  if (contractorId) {
    sessionStorage.setItem(
      KIOSK_RELOAD_RESUME_KEY,
      JSON.stringify({
        returnScreen: 'contractor-signin',
        contractorId,
        contractorName: contractorName || '',
        fromInduction,
      })
    );
  }

  window.location.href = '/sign-in-contractor/';
}

export function consumeKioskReloadResume() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(KIOSK_RELOAD_RESUME_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(KIOSK_RELOAD_RESUME_KEY);

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Could not parse kiosk reload resume state:', error);
    return null;
  }
}

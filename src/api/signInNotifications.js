/**
 * Trigger a sign-in notification email after kiosk check-in.
 * Fire-and-forget: failures are logged but do not block sign-in.
 */
export async function notifySignIn(signInId) {
  if (!signInId) {
    return { success: false, error: 'Missing signInId' };
  }

  try {
    const response = await fetch('/api/notify-sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signInId }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('Sign-in notification failed:', data.error || response.statusText);
      return { success: false, error: data.error || 'Failed to send sign-in notification' };
    }

    if (data.skipped) {
      console.log('Sign-in notification skipped:', data.reason);
    } else {
      console.log('Sign-in notification sent to:', data.recipientEmail);
    }

    return { success: true, ...data };
  } catch (error) {
    console.warn('Sign-in notification error:', error.message);
    return { success: false, error: error.message };
  }
}

const { notifySignIn } = require('./signInNotificationEmail');

const NOTIFY_TIMEOUT_MS = 12000;

/**
 * Run sign-in notification to completion (Vercel may kill fire-and-forget work after the response).
 */
async function runSignInNotification(signInId, options = {}) {
  if (!signInId) {
    return { success: false, error: 'Missing signInId' };
  }

  const started = Date.now();
  try {
    const result = await Promise.race([
      notifySignIn(signInId, options),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign-in notification timed out')), NOTIFY_TIMEOUT_MS);
      }),
    ]);

    const elapsedMs = Date.now() - started;
    if (result?.skipped) {
      console.log('Sign-in notification skipped', { signInId, reason: result.reason, elapsedMs });
    } else if (result?.success) {
      console.log('Sign-in notification sent', {
        signInId,
        recipientEmail: result.recipientEmail,
        messageId: result.messageId,
        elapsedMs,
      });
    } else {
      console.warn('Sign-in notification incomplete', { signInId, result, elapsedMs });
    }

    return result;
  } catch (error) {
    console.error('Sign-in notification failed', {
      signInId,
      error: error?.message || error,
      elapsedMs: Date.now() - started,
    });
    return { success: false, error: error?.message || 'Notification failed' };
  }
}

module.exports = {
  runSignInNotification,
  NOTIFY_TIMEOUT_MS,
};

/**
 * Classify Supabase / PostgREST / Storage failures so UI can show accurate messages.
 */

export function isSupabaseConnectivityFailure(error) {
  if (!error) {
    return false;
  }

  const msg = String(error.message || error || '').toLowerCase();
  const code = String(error.code || error.status || error.statusCode || '');

  return (
    msg.includes('failed to fetch')
    || msg.includes('network request failed')
    || msg.includes('network error')
    || msg.includes('connection timed out')
    || msg.includes('timeout')
    || msg.includes('database timeout')
    || msg.includes('database unavailable')
    || msg.includes('522')
    || msg.includes('544')
    || code === '544'
    || code === '522'
    || code === 'ECONNRESET'
    || code === 'ETIMEDOUT'
  );
}

export const SUPABASE_UNAVAILABLE_MESSAGE =
  'ContractorHQ cannot reach the database right now (Supabase connection timeout). '
  + 'Kiosk sign-in and accreditation documents will not work until the database responds again. '
  + 'If you manage Supabase, open the project dashboard and restart the database or check for a paused project.';

export function supabaseUnavailableError(cause) {
  const err = new Error(SUPABASE_UNAVAILABLE_MESSAGE);
  err.name = 'SupabaseUnavailableError';
  if (cause) {
    err.cause = cause;
  }
  return err;
}

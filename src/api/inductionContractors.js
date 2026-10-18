/**
 * Standalone induction contractor roster via Vercel (service role).
 */

export async function listInductionContractorsViaApi() {
  const response = await fetch('/api/induction-contractors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list' }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || `Failed to load contractors (${response.status})`);
  }
  return body.data || [];
}

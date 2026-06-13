export async function migrateTrainingStorage({ email, password, dryRun = false }) {
  const response = await fetch('/api/migrate-training-storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, dryRun }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || `Server error (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function migrateTrainingStorage({ email, password, dryRun = false }) {
  const response = await fetch('/api/migrate-training-storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, dryRun }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Failed to organize training storage');
  }

  return data;
}

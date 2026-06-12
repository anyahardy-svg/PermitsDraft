/**
 * Email normalization helpers for case-insensitive login flows.
 */

export function normalizeEmailInput(email) {
  return String(email || '').trim();
}

export function normalizeEmailForComparison(email) {
  return normalizeEmailInput(email).toLowerCase();
}

export function uniqueEmailCandidates(...emails) {
  const seen = new Set();
  const candidates = [];

  for (const email of emails) {
    const normalized = normalizeEmailInput(email);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    candidates.push(normalized);
  }

  return candidates;
}

/**
 * Pick the best company when an email appears on multiple company contact fields.
 * Handles duplicate contact_email rows (e.g. EAPS + Global Security both listing annab@...).
 */

export const normalizeCompanyToken = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export const emailsMatchInsensitive = (left, right) => {
  if (!left || !right) {
    return false;
  }
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
};

export const scoreCompanyForAuthEmail = (company, email) => {
  const trimmed = String(email || '').trim();
  let score = 0;

  if (emailsMatchInsensitive(company.contact_email, trimmed)) {
    score += 100;
  } else if (emailsMatchInsensitive(company.email, trimmed)) {
    score += 50;
  }

  const domainRoot = normalizeCompanyToken(trimmed.split('@')[1]?.split('.')[0] || '');
  const companyToken = normalizeCompanyToken(company.name);
  if (domainRoot && companyToken && (companyToken.includes(domainRoot) || domainRoot.includes(companyToken))) {
    score += 80;
  }

  return score;
};

export const pickBestContactCompany = (companies, email, excludeCompanyId = null) => {
  const trimmed = String(email || '').trim();
  const candidates = (companies || []).filter(
    (company) => company?.id && company.id !== excludeCompanyId
  );

  if (!candidates.length) {
    return null;
  }

  const ranked = candidates
    .map((company) => ({
      company,
      score: scoreCompanyForAuthEmail(company, trimmed),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return String(left.company.name || '').localeCompare(String(right.company.name || ''));
    });

  return ranked[0]?.company || null;
};

export const mergeCompanyRowsById = (...lists) => {
  const merged = new Map();
  for (const list of lists) {
    for (const company of list || []) {
      if (company?.id) {
        merged.set(company.id, company);
      }
    }
  }
  return [...merged.values()];
};

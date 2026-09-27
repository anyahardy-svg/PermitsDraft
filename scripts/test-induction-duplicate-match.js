const assert = require('assert');

function normalizeNameForMatch(name) {
  return (name || '').trim().toLowerCase();
}

function matchesInductionDuplicateProfile(contractor, { companyId, email, name }) {
  const contractorCompanyId = contractor?.companyId || contractor?.company_id;
  if (!companyId || contractorCompanyId !== companyId) {
    return false;
  }

  const emailNorm = String(email || '').trim().toLowerCase();
  const rowEmail = String(contractor?.email || '').trim().toLowerCase();
  const emailMatch = Boolean(emailNorm && rowEmail && rowEmail === emailNorm);

  const nameNorm = normalizeNameForMatch(name);
  const rowName = normalizeNameForMatch(contractor?.name);
  const nameMatch = Boolean(nameNorm && rowName && rowName === nameNorm);

  return emailMatch && nameMatch;
}

const companyId = 'co-1';
const base = { company_id: companyId, name: 'A Test 6', email: 'test6@example.com', phone: '0211234567' };

assert.strictEqual(
  matchesInductionDuplicateProfile(base, {
    companyId,
    email: 'test6@example.com',
    name: 'A Test 6',
  }),
  true,
);

assert.strictEqual(
  matchesInductionDuplicateProfile(base, {
    companyId,
    email: 'test6@example.com',
    name: 'Someone Else',
  }),
  false,
);

assert.strictEqual(
  matchesInductionDuplicateProfile(base, {
    companyId,
    email: 'other@example.com',
    name: 'A Test 6',
    phone: '0211234567',
  }),
  false,
);

console.log('induction duplicate match tests passed');

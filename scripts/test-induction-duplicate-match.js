const assert = require('assert');

function normalizePhoneForMatch(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '') || digits;
}

function normalizeNameForMatch(name) {
  return (name || '').trim().toLowerCase();
}

function matchesInductionDuplicateProfile(contractor, { companyId, email, name, phone }) {
  const contractorCompanyId = contractor?.companyId || contractor?.company_id;
  if (!companyId || contractorCompanyId !== companyId) {
    return false;
  }

  const emailNorm = String(email || '').trim().toLowerCase();
  const rowEmail = String(contractor?.email || '').trim().toLowerCase();
  const emailMatch = Boolean(emailNorm && rowEmail && rowEmail === emailNorm);

  const phoneNorm = normalizePhoneForMatch(phone);
  const rowPhone = normalizePhoneForMatch(contractor?.phone);
  const phoneMatch = Boolean(phoneNorm && rowPhone && rowPhone === phoneNorm);

  const nameNorm = normalizeNameForMatch(name);
  const rowName = normalizeNameForMatch(contractor?.name);
  const nameMatch = Boolean(nameNorm && rowName && rowName === nameNorm);

  if (emailMatch) return true;
  if (phoneMatch) return true;
  if (nameMatch && (emailMatch || phoneMatch)) return true;
  return false;
}

const companyId = 'co-1';
const base = { company_id: companyId, name: 'A Test 6', email: 'test6@example.com', phone: '0211234567' };

assert.strictEqual(
  matchesInductionDuplicateProfile(base, {
    companyId,
    email: 'test6@example.com',
    name: 'A Test 6',
    phone: '0211234567',
  }),
  true,
);

assert.strictEqual(
  matchesInductionDuplicateProfile(base, {
    companyId,
    email: 'other@example.com',
    name: 'A Test 6',
    phone: '0211234567',
  }),
  true,
);

assert.strictEqual(
  matchesInductionDuplicateProfile(base, {
    companyId,
    email: 'other@example.com',
    name: 'A Test 6',
    phone: '0219999999',
  }),
  false,
);

console.log('induction duplicate match tests passed');

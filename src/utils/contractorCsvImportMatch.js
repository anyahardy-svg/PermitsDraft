const normalizePhoneForMatch = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '') || digits;
};

const normalizeNameForMatch = (name) => (name || '').trim().toLowerCase();

export const findContractorInCompany = (contractors, { companyId, email, name, phone }) => {
  if (!companyId || !Array.isArray(contractors)) return null;

  const companyContractors = contractors.filter(
    (contractor) => (contractor.companyId || contractor.company_id) === companyId,
  );

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const byEmail = companyContractors.find(
      (contractor) => contractor.email && contractor.email.toLowerCase() === normalizedEmail,
    );
    if (byEmail) return byEmail;
  }

  if (name) {
    const normalizedName = normalizeNameForMatch(name);
    const byName = companyContractors.find(
      (contractor) => normalizeNameForMatch(contractor.name) === normalizedName,
    );
    if (byName) return byName;
  }

  if (phone) {
    const normalizedPhone = normalizePhoneForMatch(phone);
    if (normalizedPhone) {
      const byPhone = companyContractors.find(
        (contractor) => normalizePhoneForMatch(contractor.phone) === normalizedPhone,
      );
      if (byPhone) return byPhone;
    }
  }

  return null;
};

/**
 * Match a CSV row to an existing contractor. Prefer matches within the import company,
 * then fall back when company was blank on export and is being filled in on re-import.
 */
export const findContractorForCsvImport = (
  contractors,
  { contractorId, companyId, email, name, phone },
) => {
  if (!Array.isArray(contractors)) {
    return null;
  }

  const trimmedId = String(contractorId || '').trim();
  if (trimmedId) {
    const byId = contractors.find((contractor) => contractor.id === trimmedId);
    if (byId) {
      return byId;
    }
  }

  const inCompany = findContractorInCompany(contractors, {
    companyId,
    email,
    name,
    phone,
  });
  if (inCompany) {
    return inCompany;
  }

  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
  if (normalizedEmail) {
    const emailMatches = contractors.filter(
      (contractor) => contractor.email && contractor.email.toLowerCase() === normalizedEmail,
    );
    if (emailMatches.length === 1) {
      return emailMatches[0];
    }
  }

  const normalizedName = normalizeNameForMatch(name);
  const normalizedPhone = normalizePhoneForMatch(phone);
  if (normalizedName && normalizedPhone) {
    const namePhoneMatches = contractors.filter(
      (contractor) => (
        normalizeNameForMatch(contractor.name) === normalizedName
        && normalizePhoneForMatch(contractor.phone) === normalizedPhone
      ),
    );
    if (namePhoneMatches.length === 1) {
      return namePhoneMatches[0];
    }
  }

  return null;
};
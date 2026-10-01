export function normalizeContractorType(contractorType) {
  const normalized = String(contractorType || 'D').trim().toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(normalized) ? normalized : 'D';
}

export function isTypeDContractor(contractorType) {
  return normalizeContractorType(contractorType) === 'D';
}

export function isSection1Complete(selectedBusinessUnits = {}) {
  return Object.values(selectedBusinessUnits).some(Boolean);
}

export function isSection2Complete(selectedServices = {}) {
  return Object.values(selectedServices).some(Boolean);
}

export function isPublicLiabilityInsuranceComplete(publicLiabilityInsurance = {}) {
  const hasDocument = !!(
    publicLiabilityInsurance.has_document || publicLiabilityInsurance.url
  );
  const hasExpiry = !!String(publicLiabilityInsurance.expiry_date || '').trim();
  return hasDocument && hasExpiry;
}

export function getTypeDInsuranceValidationError(publicLiabilityInsurance) {
  if (!isPublicLiabilityInsuranceComplete(publicLiabilityInsurance)) {
    return 'Please upload your public liability insurance certificate and expiry date in Section 24 before submitting.';
  }
  return null;
}

export function isSiteSelectionComplete(selectedSiteIds = []) {
  return Array.isArray(selectedSiteIds) && selectedSiteIds.length > 0;
}

export function getSiteSelectionValidationError({
  selectedBusinessUnits,
  selectedSiteIds,
}) {
  if (!isSection1Complete(selectedBusinessUnits)) {
    return null;
  }

  if (!isSiteSelectionComplete(selectedSiteIds)) {
    return 'Please select at least one site in Section 1 before submitting.';
  }

  return null;
}

export function getTypeDSubmitValidationError({
  selectedBusinessUnits,
  selectedServices,
  selectedSiteIds,
  publicLiabilityInsurance,
}) {
  if (!isSection1Complete(selectedBusinessUnits)) {
    return 'Please select at least one business unit in Section 1 before submitting.';
  }

  const siteError = getSiteSelectionValidationError({
    selectedBusinessUnits,
    selectedSiteIds,
  });
  if (siteError) {
    return siteError;
  }

  if (!isSection2Complete(selectedServices)) {
    return 'Please select at least one service in Section 2 before submitting.';
  }

  const insuranceError = getTypeDInsuranceValidationError(publicLiabilityInsurance);
  if (insuranceError) {
    return insuranceError;
  }

  return null;
}

export function canAutoApproveTypeDAccreditation({
  contractorType,
  selectedBusinessUnits,
  selectedServices,
  publicLiabilityInsurance,
}) {
  if (!isTypeDContractor(contractorType)) {
    return false;
  }

  return (
    isSection1Complete(selectedBusinessUnits)
    && isSection2Complete(selectedServices)
    && isPublicLiabilityInsuranceComplete(publicLiabilityInsurance)
  );
}

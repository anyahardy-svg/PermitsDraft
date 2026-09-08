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

  return null;
}

export function canAutoApproveTypeDAccreditation({
  contractorType,
  selectedBusinessUnits,
  selectedServices,
}) {
  if (!isTypeDContractor(contractorType)) {
    return false;
  }

  return isSection1Complete(selectedBusinessUnits) && isSection2Complete(selectedServices);
}

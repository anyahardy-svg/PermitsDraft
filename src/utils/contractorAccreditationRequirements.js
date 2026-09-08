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

export function getTypeDSubmitValidationError({
  selectedBusinessUnits,
  selectedServices,
}) {
  if (!isSection1Complete(selectedBusinessUnits)) {
    return 'Please select at least one business unit in Section 1 before submitting.';
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

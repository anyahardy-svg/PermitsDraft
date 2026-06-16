const SUPPLIER_ACCREDITATION_STATUS_DISPLAY = {
  draft: { label: 'Draft', backgroundColor: '#FEF3C7', color: '#92400E' },
  reviewing: { label: 'Submitted', backgroundColor: '#E0E7FF', color: '#3730A3' },
  approved: { label: 'Approved', backgroundColor: '#D1FAE5', color: '#065F46' },
  trial_required: { label: 'Trial Required', backgroundColor: '#FEF3C7', color: '#92400E' },
  rejected: { label: 'Not Approved', backgroundColor: '#FEE2E2', color: '#7F1D1D' },
};

const FINAL_DECISION_STATUS_MAP = {
  Approved: 'approved',
  'Trial Required': 'trial_required',
  'Not Approved': 'rejected',
};

export function resolveSupplierAccreditationDisplayStatus(supplier = {}) {
  return supplier.accreditation_status || supplier.accreditationStatus || 'draft';
}

export function getSupplierAccreditationStatusDisplay(status) {
  return (
    SUPPLIER_ACCREDITATION_STATUS_DISPLAY[status]
    || SUPPLIER_ACCREDITATION_STATUS_DISPLAY.draft
  );
}

export function isSupplierAccreditationCompleted(status) {
  return ['approved', 'trial_required', 'rejected'].includes(status);
}

export function getStatusFromFinalDecision(finalDecision) {
  return FINAL_DECISION_STATUS_MAP[finalDecision] || null;
}

export function validateAdminAssessmentCompletion(formData = {}) {
  if (!formData.final_decision) {
    return 'Please select a final decision before completing the assessment.';
  }

  if (!String(formData.assessor_name || '').trim()) {
    return 'Please enter the name of the person approving this assessment.';
  }

  if (!formData.assessor_signature) {
    return 'Please provide an assessor signature before completing the assessment.';
  }

  const status = getStatusFromFinalDecision(formData.final_decision);
  if (!status) {
    return 'Please select a valid final decision before completing the assessment.';
  }

  return null;
}

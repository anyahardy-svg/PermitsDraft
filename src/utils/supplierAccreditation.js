const SUPPLIER_ACCREDITATION_STATUS_DISPLAY = {
  draft: { label: 'Draft', backgroundColor: '#FEF3C7', color: '#92400E' },
  reviewing: { label: 'Submitted', backgroundColor: '#E0E7FF', color: '#3730A3' },
  approved: { label: 'Approved', backgroundColor: '#D1FAE5', color: '#065F46' },
  rejected: { label: 'Rejected', backgroundColor: '#FEE2E2', color: '#7F1D1D' },
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

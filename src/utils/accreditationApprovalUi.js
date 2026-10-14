function normalizeId(value) {
  return value == null ? '' : String(value).trim().toLowerCase();
}

/**
 * When a manager opens accreditation from the hub, return 'manager' | 'hs' if they should use the approval review UX.
 */
export function getAccreditationApprovalStageForAdmin(company, adminUserId) {
  if (!company || !adminUserId) {
    return null;
  }

  const adminId = normalizeId(adminUserId);
  const status = company.accreditationStatus || company.accreditation_status;

  if (
    status === 'pending_manager'
    && normalizeId(company.assignedManagerId || company.assigned_manager_id) === adminId
  ) {
    return 'manager';
  }

  if (
    status === 'pending_hs'
    && normalizeId(company.assignedHsPersonId || company.assigned_hs_person_id) === adminId
  ) {
    return 'hs';
  }

  return null;
}

export function accreditationApprovalStageLabel(stage) {
  if (stage === 'manager') {
    return 'Manager';
  }
  if (stage === 'hs') {
    return 'Health & Safety';
  }
  return '';
}

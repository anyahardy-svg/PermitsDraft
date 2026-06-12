export const DEFAULT_ACCREDITATION_DEADLINE = '18/06/2026';

export function getDefaultAccreditationDeadline() {
  return DEFAULT_ACCREDITATION_DEADLINE;
}

const EXPLICIT_ACCREDITATION_STATUSES = new Set([
  'approved',
  'completed',
  'needs_revision',
  'pending',
]);

/**
 * Derive the accreditation status to show in admin UI.
 * The DB column defaults to 'in-progress' for all rows, so raw values are unreliable
 * until a company has actually started the accreditation workflow.
 */
export function resolveAccreditationDisplayStatus(company = {}) {
  const rawStatus = company.accreditation_status || company.accreditationStatus || null;
  const accreditedDate = company.accredited_date || company.accreditedDate || null;
  const invitationSentAt =
    company.accreditation_invitation_sent_at || company.accreditationInvitationSentAt || null;
  const lastUpdated =
    company.accreditation_last_updated || company.accreditationLastUpdated || null;

  if (EXPLICIT_ACCREDITATION_STATUSES.has(rawStatus)) {
    return rawStatus;
  }

  if (accreditedDate) {
    return 'approved';
  }

  if (lastUpdated) {
    return 'in-progress';
  }

  if (invitationSentAt) {
    return 'started';
  }

  if (!rawStatus || rawStatus === 'none' || rawStatus === 'in-progress' || rawStatus === 'started') {
    return 'none';
  }

  return rawStatus;
}

export function getAccreditationSaveStatus(status) {
  if (status === 'none' || status === 'started') {
    return 'in-progress';
  }
  return status;
}

const ACCREDITATION_STATUS_DISPLAY = {
  approved: { label: '✓ Approved', backgroundColor: '#D1FAE5', color: '#065F46' },
  completed: { label: '✓ Completed', backgroundColor: '#D1FAE5', color: '#065F46' },
  pending: { label: '⟳ Pending', backgroundColor: '#E0E7FF', color: '#3730A3' },
  needs_revision: { label: '⚠ Needs Revision', backgroundColor: '#FEE2E2', color: '#7F1D1D' },
  'in-progress': { label: '→ In Progress', backgroundColor: '#FEF3C7', color: '#92400E' },
  started: { label: '→ Started', backgroundColor: '#E0E7FF', color: '#3730A3' },
  none: { label: '○ None', backgroundColor: '#F3F4F6', color: '#6B7280' },
};

export function getAccreditationStatusDisplay(status) {
  return ACCREDITATION_STATUS_DISPLAY[status] || ACCREDITATION_STATUS_DISPLAY.none;
}

export function getAccreditationModalStatusLabel(status) {
  const display = getAccreditationStatusDisplay(status);
  if (status === 'none') {
    return '○ Not Submitted';
  }
  if (status === 'in-progress') {
    return '⏳ In Progress';
  }
  return display.label;
}

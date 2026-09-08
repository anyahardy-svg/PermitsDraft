const REMINDER_ELIGIBLE_CONTRACTOR_TYPES = ['A', 'B', 'C'];
const REMINDER_EXCLUDED_ACCREDITATION_STATUSES = ['approved', 'completed'];

function normalizeContractorType(contractorType) {
  const normalized = String(contractorType || 'D').trim().toUpperCase();
  return REMINDER_ELIGIBLE_CONTRACTOR_TYPES.includes(normalized) ? normalized : 'D';
}

function shouldScheduleAccreditationReminder(contractorType) {
  return REMINDER_ELIGIBLE_CONTRACTOR_TYPES.includes(normalizeContractorType(contractorType));
}

function isEligibleForAccreditationReminder(company, now = new Date()) {
  if (!company?.accreditation_invitation_sent_at) {
    return false;
  }

  if (company.accredited_date) {
    return false;
  }

  if (!shouldScheduleAccreditationReminder(company.contractor_type)) {
    return false;
  }

  const status = String(company.accreditation_status || '').toLowerCase();
  if (REMINDER_EXCLUDED_ACCREDITATION_STATUSES.includes(status)) {
    return false;
  }

  if (company.company_active === false) {
    return false;
  }

  if (!company.accreditation_next_reminder_at) {
    return false;
  }

  return new Date(company.accreditation_next_reminder_at) <= now;
}

function applyAccreditationReminderQueryFilters(query, nowIso) {
  return query
    .not('accreditation_invitation_sent_at', 'is', null)
    .is('accredited_date', null)
    .in('contractor_type', REMINDER_ELIGIBLE_CONTRACTOR_TYPES)
    .not('accreditation_status', 'in', `(${REMINDER_EXCLUDED_ACCREDITATION_STATUSES.join(',')})`)
    .or('company_active.is.null,company_active.eq.true')
    .not('accreditation_next_reminder_at', 'is', null)
    .lte('accreditation_next_reminder_at', nowIso);
}

module.exports = {
  REMINDER_ELIGIBLE_CONTRACTOR_TYPES,
  REMINDER_EXCLUDED_ACCREDITATION_STATUSES,
  applyAccreditationReminderQueryFilters,
  isEligibleForAccreditationReminder,
  shouldScheduleAccreditationReminder,
};

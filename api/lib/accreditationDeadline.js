const DEFAULT_ACCREDITATION_DEADLINE_DAYS = 28;

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

function resolveAccreditationInvitationDeadline(deadlineInput, fromDate = new Date()) {
  if (deadlineInput) {
    const parsed = new Date(deadlineInput);
    if (!Number.isNaN(parsed.getTime())) {
      return startOfLocalDay(parsed);
    }
  }
  return addDays(fromDate, DEFAULT_ACCREDITATION_DEADLINE_DAYS);
}

function formatAccreditationDeadlineDdMmYyyy(date) {
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAccreditationDeadlineEmail(date) {
  return date.toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

module.exports = {
  DEFAULT_ACCREDITATION_DEADLINE_DAYS,
  resolveAccreditationInvitationDeadline,
  formatAccreditationDeadlineDdMmYyyy,
  formatAccreditationDeadlineEmail,
};

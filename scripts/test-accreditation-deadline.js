const assert = require('assert');
const {
  DEFAULT_ACCREDITATION_DEADLINE_DAYS,
  resolveAccreditationInvitationDeadline,
  formatAccreditationDeadlineDdMmYyyy,
  formatAccreditationDeadlineEmail,
} = require('../api/lib/accreditationDeadline');

function daysBetween(from, to) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to - from) / msPerDay);
}

const base = new Date('2026-09-28T15:30:00');

const defaultDeadline = resolveAccreditationInvitationDeadline(null, base);
assert.strictEqual(DEFAULT_ACCREDITATION_DEADLINE_DAYS, 28);
const baseStart = new Date(base);
baseStart.setHours(0, 0, 0, 0);
assert.strictEqual(daysBetween(baseStart, defaultDeadline), 28);

const explicit = resolveAccreditationInvitationDeadline('2026-12-01', base);
assert.strictEqual(formatAccreditationDeadlineDdMmYyyy(explicit), '01/12/2026');

const emailLabel = formatAccreditationDeadlineEmail(defaultDeadline);
assert.ok(emailLabel.includes('2026'), emailLabel);

console.log('Accreditation deadline helper tests passed');

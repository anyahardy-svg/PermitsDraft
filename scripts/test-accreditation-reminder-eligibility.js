const assert = require('assert');
const {
  isEligibleForAccreditationReminder,
  shouldScheduleAccreditationReminder,
} = require('../api/lib/accreditationReminderEligibility');

assert.strictEqual(shouldScheduleAccreditationReminder('D'), false);
assert.strictEqual(shouldScheduleAccreditationReminder('A'), true);

const dueAt = new Date('2026-01-01T00:00:00.000Z');
const now = new Date('2026-02-01T00:00:00.000Z');

assert.strictEqual(
  isEligibleForAccreditationReminder(
    {
      accreditation_invitation_sent_at: '2025-12-01T00:00:00.000Z',
      contractor_type: 'A',
      accreditation_status: 'in-progress',
      accreditation_next_reminder_at: dueAt.toISOString(),
    },
    now,
  ),
  true,
);

assert.strictEqual(
  isEligibleForAccreditationReminder(
    {
      accreditation_invitation_sent_at: '2025-12-01T00:00:00.000Z',
      contractor_type: 'D',
      accreditation_status: 'started',
      accreditation_next_reminder_at: dueAt.toISOString(),
    },
    now,
  ),
  false,
);

assert.strictEqual(
  isEligibleForAccreditationReminder(
    {
      accreditation_invitation_sent_at: '2025-12-01T00:00:00.000Z',
      contractor_type: 'B',
      accreditation_status: 'approved',
      accreditation_next_reminder_at: dueAt.toISOString(),
    },
    now,
  ),
  false,
);

console.log('accreditationReminderEligibility tests passed');

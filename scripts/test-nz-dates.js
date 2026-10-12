const assert = require('assert');
const {
  getNzYmd,
  addYearsToYmd,
  getNzYmdYearsFrom,
  getNzIsoYearsFrom,
  formatDateNz,
  getNzDayRangeUtc,
  displayToYmd,
  ymdToDisplay,
  getNzWeekStartYmd,
  dateAtNzLocalTime,
} = require('../lib/nzDates');

assert.strictEqual(formatDateNz('2027-10-12'), '12/10/2027');
assert.strictEqual(displayToYmd('12/10/2027'), '2027-10-12');
assert.strictEqual(ymdToDisplay('2027-10-12'), '12/10/2027');

const noonUtc = new Date('2026-10-12T10:00:00.000Z');
const ymdFromUtcMorning = getNzYmd(noonUtc);
assert.ok(['2026-10-12', '2026-10-13'].includes(ymdFromUtcMorning), ymdFromUtcMorning);

assert.strictEqual(addYearsToYmd('2026-10-12', 1), '2027-10-12');
assert.strictEqual(getNzYmdYearsFrom(new Date('2026-10-12T10:00:00.000Z'), 1), '2027-10-12');

const expiryIso = getNzIsoYearsFrom(new Date('2026-10-12T10:00:00.000Z'), 1);
assert.ok(expiryIso.includes('2027-10-12'), expiryIso);

const range = getNzDayRangeUtc('2026-10-12');
assert.ok(range.startIso < range.endIso);

const weekStart = getNzWeekStartYmd(new Date('2026-10-15T12:00:00.000Z'));
assert.match(weekStart, /^\d{4}-\d{2}-\d{2}$/);

const local = dateAtNzLocalTime('2026-10-12', 9, 30, 0);
const parts = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).formatToParts(local);
const hour = parts.find((p) => p.type === 'hour')?.value;
assert.strictEqual(hour, '09');

console.log('✅ test-nz-dates.js passed');

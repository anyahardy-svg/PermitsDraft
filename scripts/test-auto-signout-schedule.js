const assert = require('assert');
const {
  AUTO_SIGNOUT_HOURS_NZ,
  AUTO_SIGNOUT_TRIGGER_UTC_HOURS,
  getAucklandHour,
  isAutoSignoutScheduledHour,
  getAutoSignoutCronSchedule,
} = require('../api/lib/autoSignoutSchedule');

function nzDateAtUtc(year, month, day, utcHour) {
  return new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
}

// NZ winter (NZST, UTC+12): 17:00 UTC = 05:00 NZ
assert.strictEqual(getAucklandHour(nzDateAtUtc(2026, 7, 15, 17)), 5);
assert.strictEqual(isAutoSignoutScheduledHour(nzDateAtUtc(2026, 7, 15, 17)), true);

// NZ summer (NZDT, UTC+13): 16:00 UTC = 05:00 NZ
assert.strictEqual(getAucklandHour(nzDateAtUtc(2026, 1, 15, 16)), 5);
assert.strictEqual(isAutoSignoutScheduledHour(nzDateAtUtc(2026, 1, 15, 16)), true);

// 9am NZ winter: 21:00 UTC previous day... on same calendar UTC day for 21:00 it's 9am next NZ day
assert.strictEqual(getAucklandHour(nzDateAtUtc(2026, 7, 15, 21)), 9);
assert.strictEqual(isAutoSignoutScheduledHour(nzDateAtUtc(2026, 7, 15, 21)), true);

// 1pm NZ winter: 01:00 UTC
assert.strictEqual(getAucklandHour(nzDateAtUtc(2026, 7, 16, 1)), 13);
assert.strictEqual(isAutoSignoutScheduledHour(nzDateAtUtc(2026, 7, 16, 1)), true);

// 4pm NZ winter: 04:00 UTC
assert.strictEqual(getAucklandHour(nzDateAtUtc(2026, 7, 16, 4)), 16);
assert.strictEqual(isAutoSignoutScheduledHour(nzDateAtUtc(2026, 7, 16, 4)), true);

// Off-schedule hour should not run
assert.strictEqual(isAutoSignoutScheduledHour(nzDateAtUtc(2026, 7, 16, 12)), false);

assert.deepStrictEqual(AUTO_SIGNOUT_HOURS_NZ, [5, 9, 13, 16]);
assert.deepStrictEqual(AUTO_SIGNOUT_TRIGGER_UTC_HOURS, [16, 17, 20, 21, 0, 1, 3, 4]);
assert.strictEqual(getAutoSignoutCronSchedule(), '0 16,17,20,21,0,1,3,4 * * *');

console.log('auto sign-out schedule: ok');

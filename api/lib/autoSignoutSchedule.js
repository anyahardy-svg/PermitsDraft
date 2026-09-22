const TIMEZONE = 'Pacific/Auckland';
const AUTO_SIGNOUT_HOURS_NZ = [5, 9, 13, 16];

// UTC hours that map to 5am, 9am, 1pm, or 4pm NZ across NZDT (+13) and NZST (+12).
const AUTO_SIGNOUT_TRIGGER_UTC_HOURS = [16, 17, 20, 21, 0, 1, 3, 4];

function getAucklandHour(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-NZ', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(date), 10);
}

function isAutoSignoutScheduledHour(date = new Date()) {
  return AUTO_SIGNOUT_HOURS_NZ.includes(getAucklandHour(date));
}

function getAutoSignoutCronSchedule() {
  return `0 ${AUTO_SIGNOUT_TRIGGER_UTC_HOURS.join(',')} * * *`;
}

module.exports = {
  TIMEZONE,
  AUTO_SIGNOUT_HOURS_NZ,
  AUTO_SIGNOUT_TRIGGER_UTC_HOURS,
  getAucklandHour,
  isAutoSignoutScheduledHour,
  getAutoSignoutCronSchedule,
};

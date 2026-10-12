/**
 * Pacific/Auckland calendar and display helpers.
 * Use for DATE columns, "today", and user-facing dates (NZ operations).
 */

const NZ_TIMEZONE = 'Pacific/Auckland';

function getParts(date, includeTime) {
  const options = {
    timeZone: NZ_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  if (includeTime) {
    Object.assign(options, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
  const parts = new Intl.DateTimeFormat('en-NZ', options).formatToParts(date);
  const out = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      out[part.type] = part.value;
    }
  }
  return out;
}

/** YYYY-MM-DD for the given instant in Pacific/Auckland (default: now). */
function getNzYmd(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NZ_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Add calendar years to a YYYY-MM-DD string (NZ calendar date, not UTC). */
function addYearsToYmd(ymd, years) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const ny = y + years;
  const day = Math.min(d, daysInMonth(ny, m));
  return `${ny}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getNzYmdYearsFrom(date = new Date(), years = 1) {
  return addYearsToYmd(getNzYmd(date), years);
}

function getNzDateTimeParts(date = new Date()) {
  return getParts(date, true);
}

/**
 * UTC instant where Pacific/Auckland local time matches ymd + h:mi:s.
 */
function dateAtNzLocalTime(ymd, h = 0, mi = 0, s = 0, ms = 0) {
  const [y, mo, d] = String(ymd).split('-').map(Number);
  let guess = Date.UTC(y, mo - 1, d, h, mi, s, ms) - 13 * 3600000;
  for (let i = 0; i < 16; i += 1) {
    const p = getNzDateTimeParts(new Date(guess));
    const py = Number(p.year);
    const pm = Number(p.month);
    const pd = Number(p.day);
    const ph = Number(p.hour);
    const pmi = Number(p.minute);
    const ps = Number(p.second);
    if (py === y && pm === mo && pd === d && ph === h && pmi === mi && ps === s) {
      return new Date(guess + ms);
    }
    const dayDelta = d - pd;
    const secDelta =
      (y - py) * 365 * 86400 +
      dayDelta * 86400 +
      (h - ph) * 3600 +
      (mi - pmi) * 60 +
      (s - ps);
    guess += secDelta * 1000;
  }
  return new Date(guess);
}

/** ISO timestamptz one calendar year after the NZ local time of `fromDate`. */
function getNzIsoYearsFrom(fromDate = new Date(), years = 1) {
  const p = getNzDateTimeParts(fromDate);
  const ymd = `${p.year}-${p.month}-${p.day}`;
  const expiryYmd = addYearsToYmd(ymd, years);
  return dateAtNzLocalTime(
    expiryYmd,
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  ).toISOString();
}

function isYmdString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/** Format DATE (YYYY-MM-DD) or timestamptz for NZ users. */
function formatDateNz(value, { includeTime = false } = {}) {
  if (value == null || value === '') {
    return '—';
  }
  if (isYmdString(value)) {
    const [y, m, d] = value.trim().split('-');
    if (!includeTime) {
      return `${d}/${m}/${y}`;
    }
    return formatDateNz(dateAtNzLocalTime(value.trim(), 12, 0, 0), { includeTime: true });
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  if (includeTime) {
    return date.toLocaleString('en-NZ', { timeZone: NZ_TIMEZONE });
  }
  return date.toLocaleDateString('en-NZ', { timeZone: NZ_TIMEZONE });
}

/** Start/end UTC bounds for filtering a calendar day in NZ (for queries). */
function getNzDayRangeUtc(ymd) {
  const start = dateAtNzLocalTime(ymd, 0, 0, 0, 0);
  const nextYmdStr = addDaysToYmd(ymd, 1);
  const end = dateAtNzLocalTime(nextYmdStr, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function addDaysToYmd(ymd, days) {
  const anchor = dateAtNzLocalTime(String(ymd), 12, 0, 0, 0);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return getNzYmd(anchor);
}

function getNzYmdDaysFrom(date = new Date(), days = 0) {
  return addDaysToYmd(getNzYmd(date), days);
}

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** 0 = Sunday … 6 = Saturday in Pacific/Auckland. */
function getNzWeekday(date = new Date()) {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: NZ_TIMEZONE,
    weekday: 'short',
  }).format(date);
  return WEEKDAY_INDEX[short] ?? 0;
}

/** YYYY-MM-DD for Monday of the ISO week containing `date` in NZ. */
function getNzWeekStartYmd(date = new Date()) {
  const ymd = getNzYmd(date);
  const weekday = getNzWeekday(date);
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return addDaysToYmd(ymd, mondayOffset);
}

function ymdToDisplay(ymd) {
  const [y, m, d] = String(ymd).split('-');
  return `${d}/${m}/${y}`;
}

function displayToYmd(value) {
  const parts = String(value || '')
    .split(/[/-]/)
    .map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [day, month, year] = parts;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

module.exports = {
  NZ_TIMEZONE,
  getNzYmd,
  addYearsToYmd,
  addDaysToYmd,
  getNzYmdYearsFrom,
  getNzYmdDaysFrom,
  getNzDateTimeParts,
  dateAtNzLocalTime,
  getNzIsoYearsFrom,
  formatDateNz,
  getNzDayRangeUtc,
  isYmdString,
  getNzWeekday,
  getNzWeekStartYmd,
  ymdToDisplay,
  displayToYmd,
};

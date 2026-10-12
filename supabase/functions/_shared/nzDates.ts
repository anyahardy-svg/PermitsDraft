const NZ_TIMEZONE = "Pacific/Auckland";

function getParts(date: Date, includeTime: boolean) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: NZ_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  if (includeTime) {
    Object.assign(options, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }
  const parts = new Intl.DateTimeFormat("en-NZ", options).formatToParts(date);
  const out: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      out[part.type] = part.value;
    }
  }
  return out;
}

export function getNzYmd(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NZ_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function addYearsToYmd(ymd: string, years: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const ny = y + years;
  const day = Math.min(d, daysInMonth(ny, m));
  return `${ny}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getNzYmdYearsFrom(date: Date = new Date(), years = 1): string {
  return addYearsToYmd(getNzYmd(date), years);
}

function getNzDateTimeParts(date: Date = new Date()) {
  return getParts(date, true);
}

export function dateAtNzLocalTime(
  ymd: string,
  h = 0,
  mi = 0,
  s = 0,
  ms = 0,
): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
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

export function getNzIsoYearsFrom(fromDate: Date = new Date(), years = 1): string {
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

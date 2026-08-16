const TIMEZONE = 'Pacific/Auckland';
const DEFAULT_DAILY_CAP = 150;
const DEFAULT_INTERVAL_DAYS = 30;
const HARD_CAP = 300;

const REMINDER_EMAIL_TYPES = [
  'invitation-reminder',
  'induction-reminder',
];

function getDailyReminderCap() {
  const parsed = parseInt(process.env.REMINDER_BATCH_SIZE || String(DEFAULT_DAILY_CAP), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DAILY_CAP;
  }
  return Math.min(parsed, HARD_CAP);
}

function getReminderIntervalDays() {
  const parsed = parseInt(
    process.env.REMINDER_INTERVAL_DAYS || String(DEFAULT_INTERVAL_DAYS),
    10,
  );
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_INTERVAL_DAYS;
  }
  return parsed;
}

function getAucklandDateInfo(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-NZ', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });

  const parts = {};
  formatter.formatToParts(date).forEach((part) => {
    if (part.type === 'literal') {
      return;
    }
    if (part.type === 'weekday') {
      parts.weekday = part.value;
      return;
    }
    parts[part.type] = parseInt(part.value, 10);
  });

  return parts;
}

function isWeekendInNz(date = new Date()) {
  const { weekday } = getAucklandDateInfo(date);
  const normalized = String(weekday || '').slice(0, 3).toLowerCase();
  return normalized === 'sat' || normalized === 'sun';
}

function findAucklandMidnightUtc(year, month, day) {
  const base = Date.UTC(year, month - 1, day, 0, 0, 0);

  for (let offsetHours = 0; offsetHours < 48; offsetHours += 1) {
    const probe = new Date(base + offsetHours * 60 * 60 * 1000);
    const parts = getAucklandDateInfo(probe);
    if (parts.year === year && parts.month === month && parts.day === day) {
      return probe;
    }
  }

  throw new Error(`Could not resolve Auckland midnight for ${year}-${month}-${day}`);
}

function getAucklandDayBounds(date = new Date()) {
  const { year, month, day } = getAucklandDateInfo(date);
  const start = findAucklandMidnightUtc(year, month, day);
  const nextDay = new Date(start);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  for (let offsetHours = 0; offsetHours < 48; offsetHours += 1) {
    const probe = new Date(nextDay.getTime() + offsetHours * 60 * 60 * 1000);
    const parts = getAucklandDateInfo(probe);
    if (parts.year !== year || parts.month !== month || parts.day !== day) {
      return { start: start.toISOString(), end: probe.toISOString() };
    }
  }

  throw new Error('Could not resolve Auckland day end');
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildNextReminderAt(fromDate = new Date()) {
  return addDays(fromDate, getReminderIntervalDays()).toISOString();
}

async function countRemindersSentToday(adminClient, date = new Date()) {
  const { start, end } = getAucklandDayBounds(date);
  const { count, error } = await adminClient
    .from('email_send_log')
    .select('id', { count: 'exact', head: true })
    .in('email_type', REMINDER_EMAIL_TYPES)
    .eq('status', 'sent')
    .gte('sent_at', start)
    .lt('sent_at', end);

  if (error) {
    throw new Error(`Failed to count reminders sent today: ${error.message}`);
  }

  return count || 0;
}

async function getRemainingDailyQuota(adminClient, date = new Date()) {
  const dailyCap = getDailyReminderCap();
  const alreadySent = await countRemindersSentToday(adminClient, date);
  return {
    dailyCap,
    alreadySentToday: alreadySent,
    remainingQuota: Math.max(dailyCap - alreadySent, 0),
  };
}

async function logCronRun(adminClient, entry) {
  const { error } = await adminClient.from('reminder_cron_runs').insert(entry);
  if (error) {
    console.warn('Failed to write reminder_cron_runs:', error.message);
  }
}

module.exports = {
  REMINDER_EMAIL_TYPES,
  buildNextReminderAt,
  countRemindersSentToday,
  getAucklandDateInfo,
  getDailyReminderCap,
  getRemainingDailyQuota,
  getReminderIntervalDays,
  isWeekendInNz,
  logCronRun,
};

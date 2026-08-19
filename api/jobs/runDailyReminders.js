const { runAccreditationInvitationReminders } = require('./accreditationInvitationReminders');
const { runInductionReminders } = require('./inductionReminders');
const {
  getAucklandDateInfo,
  getDailyReminderCap,
  getRemainingDailyQuota,
  getReminderIntervalDays,
  isWeekendInNz,
  logCronRun,
} = require('../lib/reminderScheduler');
const { getSupabaseAdmin } = require('../supabaseAdmin');

async function runDailyReminders({ dryRun = false } = {}) {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const { weekday } = getAucklandDateInfo();
  const quota = await getRemainingDailyQuota(adminClient);

  const summary = {
    dryRun,
    dailyCap: quota.dailyCap,
    reminderIntervalDays: getReminderIntervalDays(),
    alreadySentToday: quota.alreadySentToday,
    remainingQuota: quota.remainingQuota,
    weekdayOnly: true,
    weekdayName: weekday,
    runSkipped: false,
    skipReason: null,
    sent: 0,
    failed: 0,
    skipped: 0,
    jobs: {},
  };

  if (isWeekendInNz()) {
    summary.runSkipped = true;
    summary.skipReason = 'weekend';
    summary.remainingQuota = 0;

    if (!dryRun) {
      await logCronRun(adminClient, {
        dry_run: dryRun,
        daily_cap: quota.dailyCap,
        already_sent_today: quota.alreadySentToday,
        remaining_quota: 0,
        run_skipped: true,
        skip_reason: 'weekend',
        summary,
      });
    }

    return summary;
  }

  if (quota.remainingQuota <= 0) {
    summary.runSkipped = true;
    summary.skipReason = 'daily_cap_reached';
    summary.note = 'Daily reminder cap already reached for today';

    if (!dryRun) {
      await logCronRun(adminClient, {
        dry_run: dryRun,
        daily_cap: quota.dailyCap,
        already_sent_today: quota.alreadySentToday,
        remaining_quota: 0,
        run_skipped: true,
        skip_reason: 'daily_cap_reached',
        summary,
      });
    }

    return summary;
  }

  let remainingQuota = quota.remainingQuota;

  const accreditationSummary = await runAccreditationInvitationReminders({
    dryRun,
    remainingQuota,
  });
  summary.jobs.accreditation = accreditationSummary;
  remainingQuota = Math.max(remainingQuota - accreditationSummary.sent, 0);

  const inductionSummary = await runInductionReminders({
    dryRun,
    remainingQuota,
  });
  summary.jobs.induction = inductionSummary;

  summary.sent = accreditationSummary.sent + inductionSummary.sent;
  summary.failed = accreditationSummary.failed + inductionSummary.failed;
  summary.skipped = accreditationSummary.skipped + inductionSummary.skipped;
  summary.remainingQuotaAfterRun = Math.max(quota.remainingQuota - summary.sent, 0);

  if (!dryRun) {
    await logCronRun(adminClient, {
      dry_run: dryRun,
      daily_cap: quota.dailyCap,
      already_sent_today: quota.alreadySentToday,
      remaining_quota: quota.remainingQuota,
      run_skipped: false,
      summary,
    });
  }

  return summary;
}

module.exports = {
  runDailyReminders,
};

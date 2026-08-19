const INDUCTION_TEMPLATE_TYPE = 'induction-reminder';

async function runInductionReminders({ dryRun = false, remainingQuota = 0 } = {}) {
  if (remainingQuota <= 0) {
    return {
      type: INDUCTION_TEMPLATE_TYPE,
      enabled: false,
      dryRun,
      dueTotal: 0,
      scheduledToday: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      remainingQuota,
      note: 'No remaining daily reminder quota',
      results: [],
    };
  }

  return {
    type: INDUCTION_TEMPLATE_TYPE,
    enabled: false,
    dryRun,
    dueTotal: 0,
    scheduledToday: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    remainingQuota,
    note: 'Induction reminders are not implemented yet; quota reserved for accreditation reminders',
    results: [],
  };
}

module.exports = {
  INDUCTION_TEMPLATE_TYPE,
  runInductionReminders,
};

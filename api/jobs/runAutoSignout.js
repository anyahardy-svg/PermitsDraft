const {
  AUTO_SIGNOUT_HOURS_NZ,
  getAucklandHour,
  isAutoSignoutScheduledHour,
  TIMEZONE,
} = require('../lib/autoSignoutSchedule');
const { getSupabaseAdmin } = require('../supabaseAdmin');

async function countOverdueSignIns(adminClient) {
  const now = new Date().toISOString();
  const { count, error } = await adminClient
    .from('sign_ins')
    .select('*', { count: 'exact', head: true })
    .is('check_out_time', null)
    .lt('auto_signout_at', now);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function runAutoSignout({ dryRun = false, force = false, now = new Date() } = {}) {
  const aucklandHour = getAucklandHour(now);

  if (!force && !isAutoSignoutScheduledHour(now)) {
    return {
      dryRun,
      skipped: true,
      skipReason: 'outside_scheduled_hour',
      timezone: TIMEZONE,
      aucklandHour,
      scheduledHoursNz: AUTO_SIGNOUT_HOURS_NZ,
      ranAt: now.toISOString(),
    };
  }

  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error('Supabase service role is not configured on the server');
  }

  const overdueBefore = await countOverdueSignIns(adminClient);

  if (dryRun) {
    return {
      dryRun: true,
      skipped: false,
      timezone: TIMEZONE,
      aucklandHour,
      overdueBefore,
      message: 'Dry run — no sign-outs performed',
      ranAt: now.toISOString(),
    };
  }

  const { error: rpcError } = await adminClient.rpc('auto_signout_inactive_workers');
  if (rpcError) {
    throw rpcError;
  }

  const overdueAfter = await countOverdueSignIns(adminClient);

  return {
    dryRun: false,
    skipped: false,
    timezone: TIMEZONE,
    aucklandHour,
    overdueBefore,
    overdueAfter,
    signedOut: Math.max(overdueBefore - overdueAfter, 0),
    ranAt: now.toISOString(),
  };
}

module.exports = {
  runAutoSignout,
};

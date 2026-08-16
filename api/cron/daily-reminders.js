const { runDailyReminders } = require('../jobs/runDailyReminders');

function isAuthorized(req) {
  if (req.headers['x-vercel-cron'] === '1') {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = req.headers.authorization || '';
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const headerSecret = req.headers['x-cron-secret'];
  return headerSecret === cronSecret;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.query?.dryRun === 'true' || req.query?.dry_run === 'true';

  try {
    const summary = await runDailyReminders({ dryRun });
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Daily reminder cron failed:', error);
    return res.status(500).json({ error: error.message || 'Reminder job failed' });
  }
}

const { runAutoSignout } = require('../jobs/runAutoSignout');
const { isAuthorizedCronRequest } = require('../lib/cronAuth');

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.query?.dryRun === 'true' || req.query?.dry_run === 'true';
  const force = req.query?.force === 'true';

  try {
    const summary = await runAutoSignout({ dryRun, force });
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Auto sign-out cron failed:', error);
    return res.status(500).json({ error: error.message || 'Auto sign-out job failed' });
  }
}

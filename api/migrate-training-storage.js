/**
 * Reorganize training-records storage into company-name folders.
 * Super admin only. Called from Admin Panel — no terminal required.
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');
const { verifySuperAdmin } = require('./lib/verifySuperAdmin');
const { migrateTrainingStorage } = require('./lib/migrateTrainingStorage');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return res.status(500).json({ error: 'Supabase service role is not configured on the server' });
  }

  const { email, password, dryRun = false } = req.body || {};

  const auth = await verifySuperAdmin(email, password);
  if (!auth.ok) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const result = await migrateTrainingStorage(adminClient, { dryRun: !!dryRun });
    return res.status(200).json(result);
  } catch (error) {
    console.error('migrate-training-storage error:', error);
    return res.status(500).json({ error: error.message || 'Migration failed' });
  }
};

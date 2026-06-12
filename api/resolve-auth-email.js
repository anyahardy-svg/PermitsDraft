/**
 * Resolve the canonical Supabase Auth email for case-insensitive login.
 *
 * Usage: POST /api/resolve-auth-email
 * Body: { email }
 */

const { getSupabaseAdmin, resolveAuthEmailCaseInsensitive } = require('./supabaseAdmin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      console.error('❌ Missing Supabase service role configuration for auth email resolution');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { email } = req.body || {};
    const trimmed = String(email || '').trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const resolvedEmail = await resolveAuthEmailCaseInsensitive(adminClient, trimmed);
    return res.status(200).json({
      success: true,
      email: resolvedEmail,
    });
  } catch (error) {
    console.error('❌ resolve-auth-email error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

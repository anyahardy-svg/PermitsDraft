/**
 * Issue a contractor password reset code with a 48-hour expiry.
 *
 * Usage: POST /api/request-contractor-password-reset
 * Body: { email }
 */

const { issuePasswordResetCode } = require('./contractorPasswordReset');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};
    const result = await issuePasswordResetCode(email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ request-contractor-password-reset error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

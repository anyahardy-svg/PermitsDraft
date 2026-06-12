/**
 * Verify a contractor password reset code.
 *
 * Usage: POST /api/verify-contractor-reset-token
 * Body: { email, token }
 */

const { verifyPasswordResetCode } = require('./contractorPasswordReset');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, token } = req.body || {};
    const result = await verifyPasswordResetCode(email, token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ verify-contractor-reset-token error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

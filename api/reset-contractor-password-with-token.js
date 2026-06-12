/**
 * Reset a contractor password using a valid reset code.
 *
 * Usage: POST /api/reset-contractor-password-with-token
 * Body: { email, token, password }
 */

const { resetPasswordWithCode } = require('./contractorPasswordReset');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, token, password } = req.body || {};
    const result = await resetPasswordWithCode(email, token, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ reset-contractor-password-with-token error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

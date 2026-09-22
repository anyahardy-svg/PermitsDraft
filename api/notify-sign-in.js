const { notifySignIn } = require('./lib/signInNotificationEmail');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signInId } = req.body || {};
    if (!signInId) {
      return res.status(400).json({ error: 'Missing signInId' });
    }

    const result = await notifySignIn(signInId);
    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('notify-sign-in error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

const { getApprovalContextByToken } = require('./lib/accreditationApproval');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.query?.token;
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    const result = await getApprovalContextByToken(token);
    if (result.error) {
      return res.status(result.status || 400).json({
        error: result.error,
        companyName: result.companyName || null,
        stage: result.stage || null,
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('get-accreditation-approval-by-token error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

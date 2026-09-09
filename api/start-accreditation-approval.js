const { startApprovalChain } = require('./lib/accreditationApproval');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { companyId } = req.body || {};
    if (!companyId) {
      return res.status(400).json({ error: 'Missing companyId' });
    }

    const baseUrl = req.headers.origin || req.headers.referer;
    const result = await startApprovalChain(companyId, baseUrl);

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('start-accreditation-approval error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

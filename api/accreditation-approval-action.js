const {
  processApprovalByToken,
  processHsApproval,
  processManagerApproval,
  processRejection,
  fetchAdminUser,
  fetchCompany,
  canActAsApprover,
} = require('./lib/accreditationApproval');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      token,
      companyId,
      stage,
      action,
      notes,
      adminUserId,
    } = req.body || {};

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const baseUrl = req.headers.origin || req.headers.referer;

    if (token) {
      const result = await processApprovalByToken({ token, action, notes, baseUrl });
      if (result.error || result.success === false) {
        return res.status(result.status || 400).json({ error: result.error });
      }
      return res.status(200).json(result);
    }

    if (!companyId || !stage || !adminUserId) {
      return res.status(400).json({ error: 'Missing companyId, stage, or adminUserId' });
    }

    if (!['manager', 'hs'].includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    const company = await fetchCompany(companyId);
    const adminUser = await fetchAdminUser(adminUserId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    if (!canActAsApprover({ company, stage, adminUser })) {
      return res.status(403).json({ error: 'You are not authorised to act at this approval stage' });
    }

    let result;
    if (action === 'approve') {
      result = stage === 'manager'
        ? await processManagerApproval({ companyId, adminUserId, notes, baseUrl })
        : await processHsApproval({ companyId, adminUserId, notes });
    } else {
      result = await processRejection({ companyId, stage, adminUserId, notes });
    }

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('accreditation-approval-action error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

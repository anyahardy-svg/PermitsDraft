const { resendApprovalNotification } = require('./lib/accreditationApproval');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    try {
      const { ensureDefaultEmailTemplates } = await import('./lib/ensureEmailTemplates.js');
      await ensureDefaultEmailTemplates();
    } catch (templateError) {
      console.warn('resend-accreditation-approval: could not ensure email templates:', templateError.message);
    }

    const { companyId } = req.body || {};
    if (!companyId) {
      return res.status(400).json({ error: 'Missing companyId' });
    }

    const result = await resendApprovalNotification(companyId);
    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('resend-accreditation-approval error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

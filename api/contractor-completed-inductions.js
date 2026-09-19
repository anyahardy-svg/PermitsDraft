/**
 * Admin contractor induction completions via service role (reliable read/write).
 *
 * GET  /api/contractor-completed-inductions
 * POST /api/contractor-completed-inductions
 *   Body: { contractorId, inductionIds, mode?: 'replace' | 'add' }
 */

const {
  getCompletedInductionsByContractorAdmin,
  setContractorCompletedInductionsAdmin,
} = require('./lib/contractorCompletedInductionsAdmin');
const { getSupabaseAdmin } = require('./supabaseAdmin');

export default async function handler(req, res) {
  if (!getSupabaseAdmin()) {
    return res.status(500).json({
      error: 'Supabase service role is not configured on the server',
    });
  }

  try {
    if (req.method === 'GET') {
      const completedByContractor = await getCompletedInductionsByContractorAdmin();
      return res.status(200).json({ completedByContractor });
    }

    if (req.method === 'POST') {
      const contractorId = req.body?.contractorId;
      const inductionIds = req.body?.inductionIds || [];
      const mode = req.body?.mode === 'add' ? 'add' : 'replace';

      if (!contractorId) {
        return res.status(400).json({ error: 'contractorId is required' });
      }

      const savedIds = await setContractorCompletedInductionsAdmin(contractorId, inductionIds, { mode });
      const completedByContractor = await getCompletedInductionsByContractorAdmin();
      const savedNames = completedByContractor[contractorId] || [];

      return res.status(200).json({
        contractorId,
        inductionIds: savedIds,
        inductionNames: savedNames,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('contractor-completed-inductions error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to update contractor induction completions',
    });
  }
}

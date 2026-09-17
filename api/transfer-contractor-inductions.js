/**
 * Transfer completed induction records from one contractor row to another.
 *
 * POST /api/transfer-contractor-inductions
 * Body:
 *   action: "search" | "preview" | "transfer"
 *   email?, name?, phone?, excludeContractorId?  (search)
 *   sourceContractorId?                           (preview/transfer)
 *   targetContractorId?                           (transfer)
 *   mergeProfileFields?                           (transfer, default true)
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');
const {
  findContractorsWithCompletedInductions,
  getTransferPreview,
  transferContractorInductions,
} = require('./lib/contractorInductionTransfer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    console.error('Missing Supabase service role configuration for induction transfer');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const body = req.body || {};
    const action = body.action || 'transfer';

    if (action === 'search') {
      const candidates = await findContractorsWithCompletedInductions(adminClient, {
        email: body.email,
        name: body.name,
        phone: body.phone,
        excludeContractorId: body.excludeContractorId || null,
      });

      return res.status(200).json({
        success: true,
        candidates,
      });
    }

    if (action === 'preview') {
      if (!body.sourceContractorId) {
        return res.status(400).json({ error: 'sourceContractorId is required' });
      }

      const preview = await getTransferPreview(adminClient, body.sourceContractorId);
      return res.status(200).json({
        success: true,
        preview,
      });
    }

    if (!body.sourceContractorId || !body.targetContractorId) {
      return res.status(400).json({ error: 'sourceContractorId and targetContractorId are required' });
    }

    const result = await transferContractorInductions(adminClient, {
      sourceContractorId: body.sourceContractorId,
      targetContractorId: body.targetContractorId,
      mergeProfileFields: body.mergeProfileFields !== false,
      reassignSignIns: body.reassignSignIns !== false,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('transfer-contractor-inductions error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

/**
 * Resolve application profile for a Supabase authenticated user.
 * Auth (auth.users) proves identity; this enriches company/contractor details
 * from the contractors table when they are not already in user_metadata.
 *
 * Usage: POST /api/lookup-contractor
 * Headers: Authorization: Bearer <supabase_access_token>
 */

const {
  getSupabaseAdmin,
  lookupContractorByEmail,
  syncAuthUserContractorMetadata,
} = require('./supabaseAdmin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      console.error('❌ Missing Supabase service role configuration for contractor lookup');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const accessToken = authHeader.slice('Bearer '.length).trim();
    const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
    const user = userData?.user;

    if (userError || !user?.email) {
      console.error('❌ Invalid auth token for contractor lookup:', userError?.message);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const metadata = user.user_metadata || {};

    if (metadata.contractor_id) {
      const { data: contractorById } = await adminClient
        .from('contractors')
        .select('id, name, company_id, email')
        .eq('id', metadata.contractor_id)
        .maybeSingle();

      if (contractorById) {
        return res.status(200).json({ success: true, contractor: contractorById });
      }
    }

    const contractor = await lookupContractorByEmail(adminClient, user.email);
    if (!contractor) {
      console.error('❌ No contractor row for authenticated user:', user.email);
      return res.status(404).json({ error: 'Contractor record not found' });
    }

    await syncAuthUserContractorMetadata(adminClient, user, contractor);

    return res.status(200).json({ success: true, contractor });
  } catch (error) {
    console.error('❌ lookup-contractor error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

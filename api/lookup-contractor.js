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
  lookupContractorForAuthUser,
  getLatestApprovedJoinRequest,
  resolveValidatedCompanyIdForAuthUser,
  syncAuthUserContractorMetadata,
  contractorBelongsToAuthUser,
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

    const contractor = await lookupContractorForAuthUser(adminClient, user);
    if (contractor) {
      const trustedMetadataLink = metadata.contractor_id === contractor.id;
      if (!contractorBelongsToAuthUser(contractor, user, { trustedMetadataLink })) {
        console.error(
          '❌ Contractor profile mismatch for authenticated user:',
          user.email,
          contractor.email
        );
        return res.status(403).json({ error: 'Contractor profile does not match authenticated user' });
      }

      await syncAuthUserContractorMetadata(adminClient, user, contractor);

      return res.status(200).json({
        success: true,
        contractor: {
          ...contractor,
          email: user.email,
        },
      });
    }

    const validatedCompanyId = await resolveValidatedCompanyIdForAuthUser(adminClient, user);
    if (validatedCompanyId) {
      console.log(
        `✅ Company contact (admin staff) for ${user.email} — company:`,
        validatedCompanyId
      );

      if (metadata.company_id !== validatedCompanyId || metadata.user_type !== 'admin_staff') {
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...metadata,
            company_id: validatedCompanyId,
            user_type: 'admin_staff',
          },
        });
      }

      return res.status(200).json({
        success: true,
        contractor: {
          id: null,
          name: metadata.name || metadata.contractor_name || user.email,
          company_id: validatedCompanyId,
          email: user.email,
          user_type: 'admin_staff',
        },
      });
    }

    const joinRequest = await getLatestApprovedJoinRequest(adminClient, user.email);
    if (joinRequest?.company_id) {
      const joinUserType =
        joinRequest.user_type ||
        (joinRequest.will_work_on_site === false ? 'admin_staff' : 'contractor');
      console.log(
        `✅ Approved join request for ${user.email} — company:`,
        joinRequest.company_id,
        'role:',
        joinUserType
      );
      return res.status(200).json({
        success: true,
        contractor: {
          id: null,
          name: metadata.name || user.email,
          company_id: joinRequest.company_id,
          email: user.email,
          user_type: joinUserType,
        },
      });
    }

    console.error('❌ No contractor row for authenticated user:', user.email);
    return res.status(404).json({ error: 'Contractor record not found' });
  } catch (error) {
    console.error('❌ lookup-contractor error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

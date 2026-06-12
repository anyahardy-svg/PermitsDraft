/**
 * Set password for a contractor account
 * Used after join request approval when contractor sets their password
 * 
 * Usage: POST /api/set-contractor-password
 * Body: { email, password }
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable to be set
 */

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  getSupabaseAdmin,
  findAuthUserStrictCaseInsensitive,
  emailsMatch,
  lookupContractorForAuthUser,
} = require('./supabaseAdmin');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    if (!SUPABASE_URL) {
      console.error('❌ Missing SUPABASE_URL');
      return res.status(500).json({ error: 'Server configuration error: SUPABASE_URL not set' });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
      // Log all available environment variables that might be the service role key
      const supabaseEnv = Object.keys(process.env)
        .filter(k => k.toUpperCase().includes('SUPABASE') || k.toUpperCase().includes('SERVICE') || k.toUpperCase().includes('ROLE'))
        .map(k => ({ name: k, exists: !!process.env[k], length: process.env[k]?.length || 0 }));
      console.error('🔍 Available Supabase-related env vars:', JSON.stringify(supabaseEnv, null, 2));
      return res.status(500).json({ 
        error: 'Service role key not configured',
        debug: 'Check server logs for available environment variables'
      });
    }

    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      console.error('❌ Missing Supabase admin client');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const requestedEmail = String(email || '').trim();
    const user = await findAuthUserStrictCaseInsensitive(adminClient, requestedEmail);
    if (!user) {
      console.error('❌ No user found with email:', requestedEmail);
      return res.status(400).json({ error: 'User not found' });
    }

    if (!emailsMatch(user.email, requestedEmail)) {
      console.error(
        '❌ Refusing password update — auth user email does not match request:',
        user.email,
        requestedEmail
      );
      return res.status(400).json({ error: 'User not found' });
    }

    console.log(`🔐 Setting password for contractor: ${user.email}`);
    console.log(`✅ Found user: ${user.id}`);

    const contractor = await lookupContractorForAuthUser(adminClient, user);

    const serviceHeaders = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };

    const userMetadata = {
      ...(user.user_metadata || {}),
      user_type: 'contractor',
    };

    if (contractor) {
      userMetadata.contractor_id = contractor.id;
      userMetadata.contractor_name = contractor.name;
      userMetadata.company_id = contractor.company_id;
      userMetadata.name = contractor.name;
      console.log(`✅ Linked contractor metadata for: ${contractor.name}`);
    } else {
      console.warn(`⚠️ No contractor row found for ${user.email} while setting password`);
    }

    // Update user's password
    const updateResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: 'PUT',
        headers: serviceHeaders,
        body: JSON.stringify({
          password: password,
          email_confirm: true,
          user_metadata: userMetadata,
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to set password:', updateResponse.status, error);
      return res.status(400).json({ error: 'Failed to set password' });
    }

    const updatedUser = await updateResponse.json();
    console.log(`✅ Password set successfully for: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Password set successfully',
      userId: updatedUser.id
    });
  } catch (error) {
    console.error('❌ Error setting password:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

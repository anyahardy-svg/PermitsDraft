/**
 * Set password for a contractor account
 * Used after join request approval when contractor sets their password
 * 
 * Usage: POST /api/set-contractor-password
 * Body: { email, password }
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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
      console.error('Available env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('KEY')).slice(0, 10));
      return res.status(500).json({ error: 'Server configuration error: Service role key not configured' });
    }

    console.log(`🔐 Setting password for contractor: ${email}`);

    // Use service role key to update user password
    // First, get the user by email
    const getUserResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!getUserResponse.ok) {
      console.error('❌ Failed to get user:', getUserResponse.status);
      return res.status(400).json({ error: 'User not found' });
    }

    const usersData = await getUserResponse.json();
    
    if (!usersData.users || usersData.users.length === 0) {
      console.error('❌ No user found with email:', email);
      return res.status(400).json({ error: 'User not found' });
    }

    const user = usersData.users[0];
    console.log(`✅ Found user: ${user.id}`);

    // Update user's password
    const updateResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          password: password,
          email_confirm: true  // Ensure email is confirmed
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to set password:', updateResponse.status, error);
      return res.status(400).json({ error: 'Failed to set password' });
    }

    const updatedUser = await updateResponse.json();
    console.log(`✅ Password set successfully for: ${email}`);

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

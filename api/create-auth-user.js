/**
 * Backend endpoint to create auth users
 * Uses Supabase REST API to create users
 * 
 * Usage: POST /api/create-auth-user
 * Body: { email, name, companyId, companyName, userType }
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase config');
      console.error('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET');
      console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { email, name, companyId, companyName, userType } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    console.log(`👤 Creating auth user: ${email} (${userType})`);

    // Create user via Supabase Auth REST API
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        email_confirm: true,  // Auto-confirm so they don't need email verification
        user_metadata: {
          name: name || email,
          company_name: companyName,
          company_id: companyId,
          user_type: userType
        }
      })
    });

    const authData = await authResponse.text();
    
    if (!authResponse.ok) {
      console.error('❌ Auth API error:', authResponse.status, authData);
      let errorMsg = 'Failed to create user';
      try {
        const parsed = JSON.parse(authData);
        errorMsg = parsed.message || parsed.error || errorMsg;
      } catch (e) {}
      return res.status(authResponse.status).json({ error: errorMsg });
    }

    const user = JSON.parse(authData);
    console.log(`✅ Auth user created: ${user.id}`);

    return res.status(200).json({
      success: true,
      userId: user.id,
      email: user.email,
      message: `User ${email} created successfully`
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}

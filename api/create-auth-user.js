/**
 * Backend endpoint to create auth users
 * Required because auth.admin methods only work with service role key
 * 
 * Usage: POST /api/create-auth-user
 * Body: { email, name, companyId, companyName, userType }
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role (has admin capabilities)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, companyId, companyName, userType } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    console.log(`👤 Creating auth user: ${email} (${userType})`);

    // Create user in Supabase Auth with service role
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,  // Auto-confirm so they don't need email verification
      user_metadata: {
        name: name || email,
        company_name: companyName,
        company_id: companyId,
        user_type: userType
      }
    });

    if (error) {
      console.error('❌ Failed to create auth user:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Auth user created: ${data.user.id}`);

    return res.status(200).json({
      success: true,
      userId: data.user.id,
      email: data.user.email,
      message: `User ${email} created successfully`
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}

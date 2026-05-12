/**
 * Backend endpoint to create auth users
 * Uses Supabase REST API to create users
 * 
 * Usage: POST /api/create-auth-user
 * Body: { email, name, companyId, companyName, userType }
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔧 create-auth-user endpoint called');
  console.log('📋 Environment check:');
  console.log('  SUPABASE_URL:', !!process.env.SUPABASE_URL);
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    if (!SUPABASE_URL) {
      console.error('❌ Missing SUPABASE_URL');
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY - required for creating auth users');
      return res.status(500).json({ 
        error: 'Service role key not configured. Admin must set SUPABASE_SERVICE_ROLE_KEY environment variable.' 
      });
    }

    const { email, name, companyId, companyName, userType } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    console.log(`👤 Creating or checking auth user: ${email} (${userType})`);
    console.log('📋 Request body:', { email, name, companyId, companyName, userType });

    // First check if user already exists
    let existingUser = null;
    
    const checkUrl = `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
    const checkHeaders = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };

    try {
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: checkHeaders,
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.users && checkData.users.length > 0) {
          existingUser = checkData.users[0];
          console.log(`✅ User already exists: ${existingUser.id}`);
        }
      } else if (checkResponse.status !== 401) {
        const errorText = await checkResponse.text();
        console.warn('⚠️ Could not check for existing user:', checkResponse.status, errorText);
      }
    } catch (checkErr) {
      console.warn('⚠️ Could not check for existing user:', checkErr.message);
    }

    // If user exists, just return their info
    if (existingUser) {
      console.log('📋 Returning existing user info');
      return res.status(200).json({
        success: true,
        userId: existingUser.id,
        email: existingUser.email,
        message: `User ${email} already exists`,
        existing: true
      });
    }

    // Create user via Supabase Auth REST API using SERVICE ROLE KEY
    console.log('🔑 Creating new user with service role key');
    
    // Generate a temporary password (user will set their own)
    const tempPassword = Math.random().toString(36).slice(-16) + 'TempPass123!';
    console.log('🔐 Generated temp password length:', tempPassword.length);
    
    const createBody = {
      email: email,
      password: tempPassword,  // Required by Supabase
      email_confirm: true,  // Auto-confirm so they don't need email verification
      user_metadata: {
        name: name || email,
        company_name: companyName,
        company_id: companyId,
        user_type: userType
      }
    };
    
    console.log('📤 Sending to Supabase Auth:', { 
      email, 
      passwordLength: tempPassword.length,
      email_confirm: true,
      user_metadata: createBody.user_metadata
    });
    
    const authUrl = `${SUPABASE_URL}/auth/v1/admin/users`;
    console.log('📍 URL:', authUrl);
    console.log('🔑 Headers - apikey present:', !!SUPABASE_SERVICE_ROLE_KEY);
    console.log('🔑 Service role key length:', SUPABASE_SERVICE_ROLE_KEY?.length);
    
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(createBody)
    });

    const authData = await authResponse.text();
    
    console.log('📥 Supabase response status:', authResponse.status);
    console.log('📥 Supabase response headers:', {
      'content-type': authResponse.headers.get('content-type'),
      'content-length': authResponse.headers.get('content-length')
    });
    console.log('📥 Supabase response length:', authData.length);
    if (authData.length < 1000) {
      console.log('📥 Full response body:', authData);
    } else {
      console.log('📥 Response preview (first 500 chars):', authData.substring(0, 500));
    }
    
    if (!authResponse.ok) {
      console.error('❌ Auth API error - Status:', authResponse.status);
      console.error('❌ Full response body:', authData);
      
      let errorMsg = 'Failed to create user';
      let errorDetails = {};
      try {
        const parsed = JSON.parse(authData);
        errorMsg = parsed.message || parsed.error || errorMsg;
        errorDetails = parsed;
        console.error('📋 Parsed error object:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.error('📋 Could not parse response as JSON:', e.message);
      }
      
      return res.status(authResponse.status).json({ 
        error: errorMsg,
        details: errorDetails,
        statusCode: authResponse.status
      });
    }

    const user = JSON.parse(authData);
    console.log(`✅ Auth user created successfully: ${user.id}`);
    console.log('📊 New user object:', {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      user_metadata: user.user_metadata
    });

    return res.status(200).json({
      success: true,
      userId: user.id,
      email: user.email,
      message: `User ${email} created successfully`,
      existing: false
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

/**
 * Server-side Brevo Email API Route
 * Handles email sending securely on the backend
 * Also handles database updates and user creation
 * 
 * Usage: POST /api/send-email
 * Body: { toEmail, companyName, deadline, isNewUser, companyId }
 */

const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY || process.env.BREVO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FROM_EMAIL = 'noreply@contractorhq.co.nz';
const FROM_NAME = 'Contractor HQ';
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';

// Simple Supabase client for server-side operations
const supabaseRequest = async (table, method, data = null, filter = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  let body = null;

  if (method === 'PATCH' && filter) {
    url += `?${filter}`;
    body = JSON.stringify(data);
  } else if (method === 'POST') {
    body = JSON.stringify(data);
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase ${table} error: ${response.status} - ${error}`);
  }

  return response.json();
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!BREVO_API_KEY) {
      console.error('❌ Brevo API key not configured');
      console.error('Available env vars:', {
        has_vite_key: !!process.env.VITE_BREVO_API_KEY,
        has_plain_key: !!process.env.BREVO_API_KEY,
        env_keys: Object.keys(process.env).filter(k => k.includes('BREVO') || k.includes('KEY')).slice(0, 5)
      });
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const { toEmail, companyName, deadline, type = 'invitation' } = req.body;

    if (!toEmail || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let actuallyNewUser = false; // Will determine based on Supabase Auth
    
    // For invitations, check if user exists in Supabase Auth FIRST
    if (type === 'invitation') {
      try {
        console.log(`🔍 Checking if ${toEmail} exists in Supabase Auth...`);
        const checkUserUrl = `${SUPABASE_URL}/auth/v1/admin/users?limit=10000`;
        const listUsersResponse = await fetch(checkUserUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        if (listUsersResponse.ok) {
          const usersData = await listUsersResponse.json();
          actuallyNewUser = !usersData.users || !usersData.users.some(u => u.email === toEmail);
          console.log(`✓ User check result: ${actuallyNewUser ? 'NEW USER' : 'EXISTING USER'}`);
        }
      } catch (checkErr) {
        console.warn(`⚠️ Could not check user existence, defaulting to existing user template:`, checkErr.message);
        actuallyNewUser = false;
      }
    }

    let subject, htmlContent;

    if (type === 'invitation') {
      const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-NZ', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'As soon as possible';

      subject = actuallyNewUser 
        ? `${companyName} - Complete Your Company Accreditation`
        : `Request to Complete ${companyName} Accreditation`;

      htmlContent = actuallyNewUser 
        ? `
          <h2>Complete Your Company Accreditation</h2>
          <p>Hello,</p>
          <p>${companyName} is requesting that you complete an accreditation questionnaire.</p>
          <p><strong>Deadline:</strong> ${deadlineStr}</p>
          <p>To get started, you'll need to create a password and access our portal:</p>
          <p><a href="https://contractorhq.co.nz/sign-in-contractor?type=invited" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Create Your Password</a></p>
          <p style="margin-top: 16px; padding: 12px; background-color: #F0F9FF; border-left: 3px solid #3B82F6; font-size: 13px;">
            <strong>Already have an account?</strong> If you've already registered before, please use the "Forgot Password" option to reset your password instead of creating a new account.
          </p>
          <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
        `
        : `
          <h2>Complete Your Company Accreditation Return</h2>
          <p>Hello,</p>
          <p>Firth Industries Ltd or Winstone Aggregates is requesting that ${companyName} complete an accreditation questionnaire.</p>
          <p><strong>Deadline:</strong> ${deadlineStr}</p>
          <p>To complete the accreditation, please log in to your account:</p>
          <p><a href="https://contractorhq.co.nz/sign-in-contractor" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
          <p>If you've forgotten your password, click "Forgot?" on the login page to reset it.</p>
          <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
        `;
    } else if (type === 'request') {
      const { name, email: senderEmail } = req.body;
      subject = `[Accreditation Request] ${companyName} - ${name}`;
      htmlContent = `
        <h2>New Accreditation Invitation Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${senderEmail}</p>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><a href="mailto:${senderEmail}">Reply to ${name}</a></p>
      `;
    } else {
      return res.status(400).json({ error: 'Invalid email type' });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: type === 'request' ? SUPPORT_EMAIL : toEmail }],
        subject: subject,
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Brevo API error:', error);
      return res.status(500).json({ error: error.message || 'Failed to send email' });
    }

    const data = await response.json();
    console.log(`✅ Email sent (${type}) to:`, type === 'request' ? SUPPORT_EMAIL : toEmail);

    // For invitation emails, update the company record and create user if needed
    if (type === 'invitation') {
      const { companyId, deadline: deadlineParam } = req.body;
      
      try {
        // Check if we have Supabase credentials
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          console.error('❌ Supabase credentials not available for DB update');
          console.error('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET');
          console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
        } else {
          // Update companies table with invitation sent timestamp and deadline
          if (companyId) {
            const deadlineDate = deadlineParam ? new Date(deadlineParam).toISOString().split('T')[0] : null;
            console.log(`📝 Updating company ${companyId} with deadline: ${deadlineDate}`);
            
            const updateUrl = `${SUPABASE_URL}/rest/v1/companies?id=eq.${companyId}`;
            const updateResponse = await fetch(updateUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                accreditation_invitation_sent_at: new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }),
                accreditation_deadline: deadlineDate,
              }),
            });

            if (updateResponse.ok) {
              console.log(`✅ Updated company ${companyId} with invitation sent date and deadline`);
            } else {
              const dbError = await updateResponse.text();
              console.error(`❌ Failed to update company: ${updateResponse.status} - ${dbError}`);
            }
          }

          // Create user in Supabase Auth if this is actually a new user
          // (We already checked this above before sending the email)
          console.log(`👤 User creation check: actuallyNewUser = ${actuallyNewUser}`);
          
          if (actuallyNewUser) {
            console.log(`👤 Creating new user for ${toEmail}`);
            const authUrl = `${SUPABASE_URL}/auth/v1/admin/users`;
            const authPayload = {
              email: toEmail,
              email_confirm: false,
              user_metadata: {
                company_name: companyName,
                company_id: companyId,
              },
            };
            
            console.log(`📤 Auth request to: ${authUrl}`);
            console.log(`📤 Payload:`, authPayload);
            
            try {
              const authResponse = await fetch(authUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(authPayload),
              });

              const authData = await authResponse.text();
              console.log(`📥 Auth response status: ${authResponse.status}`);
              console.log(`📥 Auth response body:`, authData);

              if (authResponse.ok) {
                console.log(`✅ Created user for ${toEmail}`);
              } else {
                console.error(`❌ Auth error: ${authResponse.status} - ${authData}`);
              }
            } catch (authErr) {
              console.error(`❌ Error creating auth user:`, authErr.message);
            }
          } else {
            console.log(`⏭️  Skipping user creation - ${toEmail} already exists in auth`);
          }
        }
      } catch (dbErr) {
        console.error(`❌ Error in invitation follow-up:`, dbErr);
        // Don't fail the operation - email was sent successfully
      }
    }

    return res.status(200).json({ success: true, messageId: data.messageId });

  } catch (error) {
    console.error('❌ Server error sending email:', error);
    return res.status(500).json({ error: error.message });
  }
}

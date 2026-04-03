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

    const { toEmail, companyName, deadline, isNewUser, type = 'invitation' } = req.body;

    if (!toEmail || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let subject, htmlContent;

    if (type === 'invitation') {
      const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-NZ', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'As soon as possible';

      subject = isNewUser 
        ? `${companyName} - Complete Your Company Accreditation`
        : `Request to Complete ${companyName} Accreditation`;

      htmlContent = isNewUser 
        ? `
          <h2>Complete Your Company Accreditation</h2>
          <p>Hello,</p>
          <p>Firth Industries Ltd or Winstone Aggregates is requesting that ${companyName} complete an accreditation questionnaire.</p>
          <p><strong>Deadline:</strong> ${deadlineStr}</p>
          <p>To get started, you'll need to create a password and access our portal:</p>
          <p><a href="https://contractorhq.co.nz/sign-in-contractor" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Set Password & Begin Accreditation</a></p>
          <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
        `
        : `
          <h2>Complete Your Company Accreditation</h2>
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
      const { companyId } = req.body;
      
      try {
        // Update companies table with invitation sent timestamp and deadline
        if (companyId) {
          const deadlineDate = deadline ? new Date(deadline).toISOString().split('T')[0] : null;
          await supabaseRequest(
            'companies',
            'PATCH',
            {
              accreditation_invitation_sent_at: new Date().toISOString(),
              accreditation_deadline: deadlineDate,
            },
            `id=eq.${companyId}`
          );
          console.log(`✅ Updated company ${companyId} with invitation sent date and deadline`);
        }

        // Create user in Supabase Auth if this is a new user
        if (isNewUser) {
          try {
            // Send magic link for signup
            const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({
                email: toEmail,
                data: {
                  company_name: companyName,
                  company_id: companyId,
                },
              }),
            });

            if (authResponse.ok) {
              console.log(`✅ Created/invited user for ${toEmail}`);
            } else {
              const authError = await authResponse.text();
              console.warn(`⚠️  Could not auto-create user, they can self-register: ${authError}`);
            }
          } catch (authErr) {
            console.warn(`⚠️  Auth creation non-critical, user can register themselves:`, authErr.message);
          }
        }
      } catch (dbErr) {
        console.warn(`⚠️  Warning updating company database:`, dbErr.message);
        // Don't fail the whole operation if database update fails, email was sent successfully
      }
    }

    return res.status(200).json({ success: true, messageId: data.messageId });

  } catch (error) {
    console.error('❌ Server error sending email:', error);
    return res.status(500).json({ error: error.message });
  }
}

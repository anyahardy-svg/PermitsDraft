/**
 * Server-side Brevo Email API Route
 * Handles email sending securely on the backend
 * Also handles database updates and user creation
 * 
 * Usage: POST /api/send-email
 * Body: { toEmail, companyName, deadline, isNewUser, companyId }
 */

const {
  getSupabaseAdmin,
  grantCompanyAdminAccess,
  syncInvitedAdminAuthUser,
} = require('./supabaseAdmin');
const { wrapEmailHtml, buildEmailFooterText } = require('./lib/emailWrapper');

const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY || process.env.BREVO_API_KEY;
const crypto = require('crypto');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const FROM_EMAIL = 'noreply@contractorhq.co.nz';
const FROM_NAME = 'Contractor HQ';
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';

function generateSupplierAccreditationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getSupplierTokenExpiryDate() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function getPublicAppOrigin(origin) {
  const fallback = (process.env.REACT_APP_BASE_URL || 'https://contractorhq.co.nz').replace(/\/$/, '');

  if (!origin) {
    return fallback;
  }

  try {
    const { hostname, protocol, host } = new URL(origin);
    if (hostname.includes('-kiosk.')) {
      return fallback;
    }
    return `${protocol}//${host}`.replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function buildSupplierInvitationFormUrl(token) {
  return `${getPublicAppOrigin()}/supplier-form?token=${encodeURIComponent(token)}`;
}

async function issueSupplierAccreditationTokenForEmail(supplierId) {
  const token = generateSupplierAccreditationToken();
  const expiresAt = getSupplierTokenExpiryDate();

  const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      accreditation_token: token,
      accreditation_token_expires_at: expiresAt,
    }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to issue supplier accreditation token: ${errorText}`);
  }

  return token;
}

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

/**
 * Helper to fetch email template from database
 */
const getEmailTemplate = async (type) => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/email_templates?type=eq.${type}&is_active=eq.true&select=*`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return data[0];
      }
    }
  } catch (err) {
    console.warn(`⚠️ Could not fetch email template (${type}):`, err.message);
  }
  return null;
};

const TEMPLATE_VARIABLE_DEFAULTS = {
  contactName: 'Contractor',
};

/**
 * Render template with variables (replaces {{variableName}} with values)
 */
const renderTemplate = (template, variables = {}) => {
  let subject = template.subject;
  let content = template.html_content;

  const templateVariables = Array.isArray(template?.variables) ? template.variables : [];
  const keys = new Set([
    ...templateVariables,
    ...Object.keys(TEMPLATE_VARIABLE_DEFAULTS),
    ...Object.keys(variables),
  ]);

  keys.forEach((key) => {
    const rawValue = variables[key];
    const hasValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';
    const value = hasValue ? String(rawValue).trim() : (TEMPLATE_VARIABLE_DEFAULTS[key] || '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    content = content.replace(regex, value);
  });

  return { subject, content };
};

const fetchCompanyContactName = async (companyId) => {
  if (!companyId || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return '';
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/companies?id=eq.${companyId}&select=contact_name`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data?.[0]?.contact_name?.trim() || '';
  } catch (err) {
    console.warn(`⚠️ Could not fetch contact name for company ${companyId}:`, err.message);
    return '';
  }
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!BREVO_API_KEY) {
      console.error('❌ Brevo API key not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const { toEmail, companyName, deadline, type = 'invitation', adminName, setupUrl, resetUrl, toName, subject, htmlContent, contactName, companyId, supplierId } = req.body;

    // Different types require different fields
    if (type === 'invitation') {
      if (!toEmail) {
        return res.status(400).json({ error: 'Missing toEmail' });
      }
      if (!companyName) {
        return res.status(400).json({ error: 'Missing companyName for invitation' });
      }
    } else if (type === 'request') {
      if (!companyName) {
        return res.status(400).json({ error: 'Missing companyName for request' });
      }
      if (!req.body.name || !req.body.email) {
        return res.status(400).json({ error: 'Missing name or email for request' });
      }
    } else if (type === 'admin-setup') {
      if (!toEmail) {
        return res.status(400).json({ error: 'Missing toEmail' });
      }
      if (!adminName || !setupUrl) {
        return res.status(400).json({ error: 'Missing adminName or setupUrl for admin-setup' });
      }
    } else if (type === 'admin-password-reset') {
      if (!toEmail) {
        return res.status(400).json({ error: 'Missing toEmail' });
      }
      if (!adminName || !resetUrl) {
        return res.status(400).json({ error: 'Missing adminName or resetUrl for password reset' });
      }
    } else if (type === 'join-request') {
      if (!toEmail) {
        return res.status(400).json({ error: 'Missing toEmail' });
      }
      // Custom email for join requests - uses provided subject and htmlContent
      if (!subject || !htmlContent) {
        return res.status(400).json({ error: 'Missing subject or htmlContent for join-request' });
      }
    } else if (type === 'supplier-invitation') {
      if (!toEmail) {
        return res.status(400).json({ error: 'Missing toEmail' });
      }
      if (!companyName) {
        return res.status(400).json({ error: 'Missing companyName for supplier invitation' });
      }
    }

    let actuallyNewUser = false; // True when no auth user exists yet (controls user creation)
    let needsPasswordSetup = true; // True when invitee still needs the password-setup link
    
    // For invitations, check if user exists in Supabase Auth FIRST
    if (type === 'invitation') {
      try {
        console.log(`🔍 Checking if ${toEmail} exists in Supabase Auth...`);
        const checkUserUrl = `${SUPABASE_URL}/auth/v1/admin/users?limit=10000`;
        const listUsersResponse = await fetch(checkUserUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
          },
        });

        if (listUsersResponse.ok) {
          const usersData = await listUsersResponse.json();
          const normalizedEmail = String(toEmail || '').trim().toLowerCase();
          const existingUser = usersData.users?.find(
            (user) => String(user.email || '').trim().toLowerCase() === normalizedEmail
          );
          actuallyNewUser = !existingUser;
          // First invite creates the auth user immediately, so resend must not
          // switch to the login template until the invitee has actually signed in.
          needsPasswordSetup = !existingUser || !existingUser.last_sign_in_at;
          console.log(
            `✓ User check result: ${actuallyNewUser ? 'NEW USER' : 'EXISTING USER'}, needsPasswordSetup: ${needsPasswordSetup}`
          );
        }
      } catch (checkErr) {
        console.warn(`⚠️ Could not check user existence, defaulting to password-setup invite link:`, checkErr.message);
        actuallyNewUser = false;
        needsPasswordSetup = true;
      }
    }

    let actualSubject, actualHtmlContent;

    // Try to fetch template from database first
    let dbTemplate = null;
    if (type !== 'join-request') {
      if (type === 'supplier-invitation') {
        try {
          const { ensureDefaultEmailTemplates } = await import('./lib/ensureEmailTemplates.js');
          await ensureDefaultEmailTemplates();
        } catch (ensureError) {
          console.warn('Could not ensure supplier invitation email template:', ensureError.message);
        }
      }
      dbTemplate = await getEmailTemplate(type);
    }

    // Handle different email types
    if (type === 'join-request') {
      // Custom email for join requests - use provided subject and htmlContent
      actualSubject = subject;
      actualHtmlContent = htmlContent;
    } else if (type === 'invitation') {
      const resolvedContactName = (contactName || '').trim() || await fetchCompanyContactName(companyId);

      if (dbTemplate) {
        // Use database template
        const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-NZ', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'As soon as possible';
        
        const companyIdParam = companyId ? `&companyId=${encodeURIComponent(companyId)}` : '';
        const signupUrl = `https://contractorhq.co.nz/sign-in-contractor?type=invited&email=${encodeURIComponent(toEmail)}${companyIdParam}`;
        const rendered = renderTemplate(dbTemplate, {
          companyName,
          contactName: resolvedContactName,
          deadline: deadlineStr,
          signupUrl,
          supportEmail: SUPPORT_EMAIL,
        });
        actualSubject = rendered.subject;
        actualHtmlContent = rendered.content;
      } else {
        // Fall back to hard-coded template
        const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-NZ', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'As soon as possible';

        actualSubject = needsPasswordSetup 
          ? `${companyName} - Complete Your Company Accreditation`
          : `Request to Complete ${companyName} Accreditation`;

        const greetingName = resolvedContactName || TEMPLATE_VARIABLE_DEFAULTS.contactName;

        actualHtmlContent = needsPasswordSetup 
          ? `
            <h2>Complete Your Company Accreditation</h2>
            <p>Dear ${escapeHtml(greetingName)},</p>
            <p>${companyName} is requesting that you complete an accreditation questionnaire.</p>
            <p><strong>Deadline:</strong> ${deadlineStr}</p>
            <p>To get started, you'll need to create a password and access our portal:</p>
            <p><a href="https://contractorhq.co.nz/sign-in-contractor?type=invited&amp;email=${encodeURIComponent(toEmail)}${companyId ? `&amp;companyId=${encodeURIComponent(companyId)}` : ''}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Create Your Password</a></p>
            <p style="margin-top: 16px; padding: 12px; background-color: #F0F9FF; border-left: 3px solid #3B82F6; font-size: 13px;">
              <strong>Already have an account?</strong> If you've already registered before, please use the "Forgot Password" option to reset your password instead of creating a new account.
            </p>
            <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
          `
          : `
            <h2>Complete Your Company Accreditation Return</h2>
            <p>Dear ${escapeHtml(greetingName)},</p>
            <p>Firth Industries Ltd or Winstone Aggregates is requesting that ${companyName} complete an accreditation questionnaire.</p>
            <p><strong>Deadline:</strong> ${deadlineStr}</p>
            <p>To complete the accreditation, please log in to your account:</p>
            <p><a href="https://contractorhq.co.nz/sign-in-contractor" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
            <p>If you've forgotten your password, click "Forgot?" on the login page to reset it.</p>
            <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
          `;
      }
    } else if (type === 'request') {
      const { name, email: senderEmail } = req.body;
      const phone = req.body.phone || 'Not provided';
      actualSubject = `[Accreditation Request] ${companyName} - ${name}`;
      actualHtmlContent = `
        <h2>New Accreditation Invitation Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(senderEmail)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
        <p><a href="mailto:${escapeHtml(senderEmail)}">Reply to ${escapeHtml(name)}</a></p>
      `;
    } else if (type === 'admin-setup') {
      if (dbTemplate) {
        // Use database template
        const rendered = renderTemplate(dbTemplate, {
          adminName,
          setupUrl,
          supportEmail: SUPPORT_EMAIL,
        });
        actualSubject = rendered.subject;
        actualHtmlContent = rendered.content;
      } else {
        // Fall back to hard-coded template
        const { adminName, setupUrl } = req.body;
        actualSubject = 'Welcome to Admin Panel - Set Your Password';
        actualHtmlContent = `
          <h2>Welcome to the Admin Panel</h2>
          <p>Hello ${adminName},</p>
          <p>Your admin account has been successfully created. To get started, please set your password:</p>
          <p><a href="${setupUrl}" style="background-color: #10B981; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: 600;">Set Your Password</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #F3F4F6; padding: 12px; border-radius: 4px;">${setupUrl}</p>
          <p style="margin-top: 16px; padding: 12px; background-color: #EFF6FF; border-left: 3px solid #3B82F6; font-size: 13px;">
            <strong>Note:</strong> This link expires in 24 hours. If you don't set your password within that time, please contact your administrator.
          </p>
          <p style="margin-top: 16px; color: #6B7280; font-size: 13px;">If you did not request admin access or have any questions, please contact your administrator.</p>
        `;
      }
    } else if (type === 'admin-password-reset') {
      if (dbTemplate) {
        // Use database template
        const rendered = renderTemplate(dbTemplate, {
          adminName,
          resetUrl,
          supportEmail: SUPPORT_EMAIL,
        });
        actualSubject = rendered.subject;
        actualHtmlContent = rendered.content;
      } else {
        // Fall back to hard-coded template
        const { adminName, resetUrl } = req.body;
        actualSubject = 'Admin Panel - Password Reset Request';
        actualHtmlContent = `
          <h2>Password Reset Request</h2>
          <p>Hello ${adminName},</p>
          <p>You have requested to reset your admin password. Click the link below to proceed:</p>
          <p><a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; display: inline-block; font-weight: 600;">Reset Your Password</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #F3F4F6; padding: 12px; border-radius: 4px;">${resetUrl}</p>
          <p style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; font-size: 13px;">
            <strong>Security Note:</strong> This link expires in 24 hours. Never share this link with anyone.
          </p>
          <p style="margin-top: 16px; color: #6B7280; font-size: 13px;">If you did not request a password reset, you can ignore this email. Your password remains unchanged.</p>
        `;
      }
    } else if (type === 'supplier-invitation') {
      const resolvedContactName = (contactName || '').trim() || 'Supplier Contact';
      const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-NZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) : 'As soon as possible';

      let formUrl = null;
      if (supplierId && SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
        try {
          const token = await issueSupplierAccreditationTokenForEmail(supplierId);
          formUrl = buildSupplierInvitationFormUrl(token);
        } catch (tokenError) {
          console.error('Failed to issue supplier accreditation token for invitation email:', tokenError);
        }
      }

      if (dbTemplate) {
        const rendered = renderTemplate(dbTemplate, {
          companyName,
          contactName: resolvedContactName,
          deadline: deadlineStr,
          supportEmail: SUPPORT_EMAIL,
          formUrl: formUrl || '',
        });
        actualSubject = rendered.subject;
        actualHtmlContent = rendered.content;
      } else {
        actualSubject = `${companyName} - Complete Your Supplier Accreditation`;
        actualHtmlContent = `
          <h2>Supplier Accreditation Invitation</h2>
          <p>Dear ${escapeHtml(resolvedContactName)},</p>
          <p>${escapeHtml(companyName)} has been invited to complete a supplier accreditation questionnaire.</p>
          <p><strong>Submit form deadline:</strong> ${deadlineStr}</p>
          ${formUrl ? `
            <p>Please use the secure link below to open your supplier accreditation form:</p>
            <p><a href="${formUrl}" style="background-color: #0284C7; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Complete Supplier Accreditation</a></p>
            <p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #F3F4F6; padding: 12px; border-radius: 4px;">${formUrl}</p>
            <p style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; font-size: 13px;">
              <strong>Security Note:</strong> This link is personal to your organisation. Do not share it with anyone else.
            </p>
          ` : `
            <p>Our team will be in touch with the next steps to complete your supplier accreditation.</p>
          `}
          <p>If you have any questions in the meantime, please contact us at ${SUPPORT_EMAIL}.</p>
        `;
      }
    } else {
      return res.status(400).json({ error: 'Invalid email type' });
    }

    // Convert HTML to plain text for better deliverability
    const stripHtmlTags = (html) => {
      return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const plainTextContent = `${stripHtmlTags(actualHtmlContent)}\n\n${buildEmailFooterText()}`;

    const wrappedHtmlContent = wrapEmailHtml(actualHtmlContent);

    const emailPayload = {
      to: [{ email: type === 'request' ? SUPPORT_EMAIL : toEmail, name: type === 'join-request' ? toName : undefined }],
      subject: actualSubject,
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      replyTo: { email: SUPPORT_EMAIL, name: 'Support' },
      htmlContent: wrappedHtmlContent,
      textContent: plainTextContent,
      headers: {
        'List-Unsubscribe': `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
        'X-Priority': '3',
        'X-Mailer': 'Contractor HQ',
      },
      params: {
        // These are Brevo template variables
        type: type,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
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
      const { deadline: deadlineParam } = req.body;
      
      try {
        // Check if we have Supabase credentials
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          console.error('❌ Supabase credentials not available for DB update');
        } else {
          // Update companies table with invitation sent timestamp and deadline
          if (companyId) {
            const deadlineDate = deadlineParam ? new Date(deadlineParam).toISOString().split('T')[0] : null;
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

          const adminClient = getSupabaseAdmin();
          const resolvedContactName = (contactName || '').trim() || null;

          if (adminClient && companyId) {
            await grantCompanyAdminAccess(adminClient, {
              email: toEmail,
              companyId,
              name: resolvedContactName,
            });
            console.log(`✅ Granted company admin access for ${toEmail} → company ${companyId}`);
          }

          // Create or update auth user for this invited admin (any email, not only contact_email)
          if (actuallyNewUser) {
            console.log(`👤 Creating new user for ${toEmail}`);
            const authUrl = `${SUPABASE_URL}/auth/v1/admin/users`;
            const authPayload = {
              email: toEmail,
              email_confirm: true,
              user_metadata: {
                company_name: companyName,
                company_id: companyId,
                name: resolvedContactName,
                user_type: 'admin_staff',
              },
            };

            try {
              const authResponse = await fetch(authUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(authPayload),
              });

              const authData = await authResponse.text();

              if (authResponse.ok) {
                console.log(`✅ Created user for ${toEmail}`);
              } else {
                console.error(`❌ Auth error: ${authResponse.status} - ${authData}`);
              }
            } catch (authErr) {
              console.error(`❌ Error creating auth user:`, authErr.message);
            }
          } else if (adminClient) {
            console.log(`🔄 Syncing existing auth user for invited admin: ${toEmail}`);
            const synced = await syncInvitedAdminAuthUser(adminClient, {
              email: toEmail,
              companyId,
              companyName,
              name: resolvedContactName,
            });
            if (synced) {
              console.log(`✅ Updated auth metadata for existing user ${toEmail}`);
            } else {
              console.warn(`⚠️ Could not find auth user to sync for ${toEmail}`);
            }
          }
        }
      } catch (dbErr) {
        console.error(`❌ Error in invitation follow-up:`, dbErr);
        // Don't fail the operation - email was sent successfully
      }
    }

    if (type === 'supplier-invitation') {
      const { deadline: deadlineParam } = req.body;

      try {
        if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
          console.error('❌ Supabase credentials not available for supplier DB update');
        } else if (supplierId) {
          const deadlineDate = deadlineParam ? new Date(deadlineParam).toISOString().split('T')[0] : null;
          const updateUrl = `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}`;
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              invitation_sent_at: new Date().toISOString(),
              accreditation_deadline: deadlineDate,
              contact_email: toEmail,
            }),
          });

          if (updateResponse.ok) {
            console.log(`✅ Updated supplier ${supplierId} with invitation sent date and deadline`);
          } else {
            const dbError = await updateResponse.text();
            console.error(`❌ Failed to update supplier: ${updateResponse.status} - ${dbError}`);
          }
        }
      } catch (dbErr) {
        console.error('❌ Error in supplier invitation follow-up:', dbErr);
      }
    }

    return res.status(200).json({ success: true, messageId: data.messageId });

  } catch (error) {
    console.error('❌ Server error sending email:', error);
    return res.status(500).json({ error: error.message });
  }
}

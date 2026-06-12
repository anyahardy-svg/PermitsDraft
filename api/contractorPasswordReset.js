const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY || process.env.BREVO_API_KEY;
const FROM_EMAIL = 'noreply@contractorhq.co.nz';
const FROM_NAME = 'Contractor HQ';
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';

const PASSWORD_RESET_CODE_EXPIRY_MS = 48 * 60 * 60 * 1000;

const {
  getSupabaseAdmin,
  findAuthUserCaseInsensitive,
  lookupContractorByEmail,
} = require('./supabaseAdmin');

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeResetCode(token) {
  return String(token || '').replace(/\s/g, '');
}

function validateStoredResetCode(user, token) {
  const metadata = user?.user_metadata || {};
  const storedCode = normalizeResetCode(metadata.password_reset_code);
  const inputCode = normalizeResetCode(token);

  if (!storedCode || !inputCode || storedCode !== inputCode) {
    return { valid: false, error: 'Invalid or expired code' };
  }

  const expiresAt = metadata.password_reset_code_expires_at;
  if (!expiresAt || new Date(expiresAt) < new Date()) {
    return {
      valid: false,
      error: 'This code has expired. Please request a new one.',
    };
  }

  return { valid: true };
}

async function clearStoredResetCode(adminClient, user) {
  const metadata = { ...(user.user_metadata || {}) };
  delete metadata.password_reset_code;
  delete metadata.password_reset_code_expires_at;

  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: metadata,
  });

  if (error) {
    console.warn('⚠️ Failed to clear password reset code:', error.message);
  }
}

async function sendPasswordResetEmail(toEmail, resetCode) {
  if (!BREVO_API_KEY) {
    throw new Error('Email service not configured');
  }

  const resetUrl = `https://contractorhq.co.nz/sign-in-contractor?type=recovery&email=${encodeURIComponent(toEmail)}`;
  const htmlContent = `
    <h2>Reset Your Contractor HQ Password</h2>
    <p>Use the code below to reset your password. This code is valid for 48 hours.</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 24px 0;">${resetCode}</p>
    <p>You can also open Contractor HQ and enter this code on the password reset screen:</p>
    <p><a href="${resetUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Open Password Reset</a></p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>Need help? Contact ${SUPPORT_EMAIL}</p>
  `;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: toEmail }],
      subject: 'Your Contractor HQ password reset code',
      htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to send password reset email');
  }
}

async function issuePasswordResetCode(email) {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return { success: false, error: 'Server configuration error' };
  }

  const trimmedEmail = String(email || '').trim();
  if (!trimmedEmail) {
    return { success: false, error: 'Missing email' };
  }

  const user = await findAuthUserCaseInsensitive(adminClient, trimmedEmail);
  if (!user) {
    return {
      success: true,
      email: trimmedEmail,
      message: 'If an account exists for this email, a reset code will be sent.',
    };
  }

  const resetCode = generateResetCode();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_EXPIRY_MS).toISOString();
  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata || {}),
      password_reset_code: resetCode,
      password_reset_code_expires_at: expiresAt,
    },
  });

  if (error) {
    console.error('❌ Failed to store password reset code:', error.message);
    return { success: false, error: 'Failed to issue password reset code' };
  }

  await sendPasswordResetEmail(user.email, resetCode);

  return {
    success: true,
    email: user.email,
    message: `Password reset code has been sent to ${user.email}. The code is valid for 48 hours.`,
  };
}

async function verifyPasswordResetCode(email, token) {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return { success: false, error: 'Server configuration error' };
  }

  const user = await findAuthUserCaseInsensitive(adminClient, email);
  if (!user) {
    return { success: false, error: 'Invalid or expired code' };
  }

  const validation = validateStoredResetCode(user, token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  return { success: true, email: user.email };
}

async function resetPasswordWithCode(email, token, password) {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return { success: false, error: 'Server configuration error' };
  }

  if (!password || String(password).length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const user = await findAuthUserCaseInsensitive(adminClient, email);
  if (!user) {
    return { success: false, error: 'Invalid or expired code' };
  }

  const validation = validateStoredResetCode(user, token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const contractor = await lookupContractorByEmail(adminClient, user.email);
  const userMetadata = {
    ...(user.user_metadata || {}),
    user_type: user.user_metadata?.user_type || 'contractor',
  };

  if (contractor) {
    userMetadata.contractor_id = contractor.id;
    userMetadata.contractor_name = contractor.name;
    userMetadata.company_id = contractor.company_id;
    userMetadata.name = contractor.name;
  }

  delete userMetadata.password_reset_code;
  delete userMetadata.password_reset_code_expires_at;

  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error) {
    console.error('❌ Failed to reset contractor password:', error.message);
    return { success: false, error: 'Failed to reset password' };
  }

  await clearStoredResetCode(adminClient, {
    ...user,
    user_metadata: userMetadata,
  });

  return {
    success: true,
    email: user.email,
    message: 'Password reset successfully',
  };
}

module.exports = {
  PASSWORD_RESET_CODE_EXPIRY_MS,
  issuePasswordResetCode,
  verifyPasswordResetCode,
  resetPasswordWithCode,
};

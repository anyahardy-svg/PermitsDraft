/**
 * Contractor Authentication API
 * Handles email/password login for contractors
 */

import { supabase } from '../supabaseClient';
import { normalizeEmailInput, uniqueEmailCandidates, normalizeEmailForComparison } from '../utils/emailNormalization';

const CONTRACTOR_CONTEXT_KEY = '_contractorContext';

export function purgeSupabaseAuthStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sb-') && key.includes('auth')) {
      localStorage.removeItem(key);
    }
  }
}

/** Drop cached Supabase sessions before invite/password-setup UI renders. */
export function bootstrapPasswordSetupPage() {
  if (typeof window === 'undefined') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const setupType = params.get('type');
  if (setupType === 'invited' || setupType === 'recovery') {
    clearContractorSessionStorage();
  }
}

export function clearContractorSessionStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  localStorage.removeItem(CONTRACTOR_CONTEXT_KEY);
  localStorage.removeItem('contractor_session');
  localStorage.removeItem('contractor_token');
  localStorage.removeItem('contractor_id');
  purgeSupabaseAuthStorage();
}

function contractorBelongsToAuthUser(contractor, user) {
  if (!contractor?.email || !user?.email) {
    return false;
  }

  return normalizeEmailForComparison(contractor.email) === normalizeEmailForComparison(user.email);
}

const getJoinRequestCompanyId = async (email) => {
  const joinRequest = await getApprovedJoinRequest(email);
  return joinRequest?.company_id || null;
};

const getCompanyAdminAccessCompanyId = async (email) => {
  if (!supabase || !email) {
    return null;
  }

  const { data: adminAccess } = await supabase
    .from('company_admin_access')
    .select('company_id')
    .ilike('email', email.trim())
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return adminAccess?.company_id || null;
};

const getCompanyIdFromContactFields = async (email) => {
  if (!supabase || !email) {
    return null;
  }

  const trimmed = email.trim();

  const { data: byContact } = await supabase
    .from('companies')
    .select('id')
    .ilike('contact_email', trimmed)
    .limit(1)
    .maybeSingle();

  if (byContact?.id) {
    return byContact.id;
  }

  const { data: byEmail } = await supabase
    .from('companies')
    .select('id')
    .ilike('email', trimmed)
    .limit(1)
    .maybeSingle();

  return byEmail?.id || null;
};

const getCompanyIdForAuthEmailClient = async (email) => {
  const adminAccessCompanyId = await getCompanyAdminAccessCompanyId(email);
  if (adminAccessCompanyId) {
    return adminAccessCompanyId;
  }

  return getCompanyIdFromContactFields(email);
};

const getApprovedJoinRequest = async (email) => {
  if (!supabase || !email) {
    return null;
  }

  const { data: joinRequest } = await supabase
    .from('contractor_join_requests')
    .select('company_id, user_type, will_work_on_site')
    .ilike('email', email.trim())
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return joinRequest || null;
};

const buildProfileFromAuthUser = (user) => {
  const metadata = user?.user_metadata || {};
  const userType = metadata.user_type || null;

  if (userType === 'admin_staff') {
    return {
      contractorId: null,
      contractorName: metadata.name || user.email,
      companyId: metadata.company_id || null,
      email: user.email,
      userType: 'admin_staff',
      isComplete: !!metadata.company_id,
    };
  }

  if (metadata.contractor_id || metadata.company_id || metadata.name) {
    return {
      contractorId: metadata.contractor_id || null,
      contractorName: metadata.contractor_name || metadata.name || user.email,
      companyId: metadata.company_id || null,
      email: user.email,
      userType: userType || 'contractor',
      isComplete: !!(metadata.company_id && (metadata.contractor_id || userType === 'admin_staff')),
    };
  }

  return null;
};

const resolveAuthEmailForLogin = async (email) => {
  const trimmed = normalizeEmailInput(email);
  if (!trimmed) {
    return trimmed;
  }

  try {
    if (typeof fetch !== 'undefined') {
      const response = await fetch('/api/resolve-auth-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (response.ok) {
        const result = await response.json();
        if (
          result.email &&
          normalizeEmailForComparison(result.email) === normalizeEmailForComparison(trimmed)
        ) {
          return result.email;
        }

        if (result.email) {
          console.warn(
            '⚠️ Ignoring resolved auth email that differs from login input:',
            result.email
          );
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not resolve auth email via API:', error.message);
  }

  return trimmed;
};

const signInWithEmailCaseInsensitive = async (email, password) => {
  const trimmed = normalizeEmailInput(email);
  if (!trimmed) {
    return {
      data: { user: null, session: null },
      error: { message: 'Email is required' },
    };
  }

  const resolvedEmail = await resolveAuthEmailForLogin(trimmed);
  const candidates = uniqueEmailCandidates(
    trimmed,
    normalizeEmailForComparison(resolvedEmail) === normalizeEmailForComparison(trimmed)
      ? resolvedEmail
      : null
  );

  let lastError = null;
  for (const tryEmail of candidates) {
    const result = await supabase.auth.signInWithPassword({
      email: tryEmail,
      password,
    });

    if (!result.error) {
      return result;
    }

    lastError = result.error;
  }

  return { data: { user: null, session: null }, error: lastError };
};

const lookupContractorByEmail = async (email, preferredCompanyId = null) => {
  if (!supabase || !email) {
    return null;
  }

  const normalizedEmail = email.trim();

  if (preferredCompanyId) {
    const { data: companyMatch } = await supabase
      .from('contractors')
      .select('id, name, company_id, email')
      .ilike('email', normalizedEmail)
      .eq('company_id', preferredCompanyId)
      .maybeSingle();

    if (companyMatch) {
      return companyMatch;
    }
  }

  const pickBestContractorRow = (rows) => {
    if (!rows?.length) {
      return null;
    }

    return rows.find((row) => row.company_id) || rows[0];
  };

  const { data: exactMatches, error: exactError } = await supabase
    .from('contractors')
    .select('id, name, company_id, email, created_at')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(5);

  if (exactError) {
    console.warn('⚠️ Contractor exact lookup error:', exactError.message);
  }

  const exactMatch = pickBestContractorRow(exactMatches);
  if (exactMatch) {
    return exactMatch;
  }

  const { data: caseInsensitiveMatches, error: ilikeError } = await supabase
    .from('contractors')
    .select('id, name, company_id, email, created_at')
    .ilike('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(5);

  if (ilikeError) {
    console.warn('⚠️ Contractor ilike lookup error:', ilikeError.message);
  }

  return pickBestContractorRow(caseInsensitiveMatches);
};

const lookupContractorViaApi = async (accessToken) => {
  if (!accessToken || typeof fetch === 'undefined') {
    return null;
  }

  try {
    const response = await fetch('/api/lookup-contractor', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = response.status;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch (parseError) {
        if (errorText) {
          errorMessage = errorText.slice(0, 200);
        }
      }
      console.warn('⚠️ Server profile lookup failed:', errorMessage);
      return null;
    }

    const result = await response.json();
    return result.contractor || null;
  } catch (error) {
    console.warn('⚠️ Server contractor lookup exception:', error.message);
    return null;
  }
};

const enrichProfileFromContractorTable = async (user, accessToken) => {
  const apiContractor = await lookupContractorViaApi(accessToken);
  if (apiContractor) {
    return apiContractor;
  }

  return lookupContractorByEmail(user.email, user.user_metadata?.company_id || null);
};

const resolveAdminStaffProfile = async (user) => {
  const metadata = user?.user_metadata || {};
  const adminAccessCompanyId = await getCompanyAdminAccessCompanyId(user.email);
  const contactFieldCompanyId = await getCompanyIdFromContactFields(user.email);
  const joinRequestCompanyId = await getJoinRequestCompanyId(user.email);
  const companyId =
    adminAccessCompanyId ||
    metadata.company_id ||
    contactFieldCompanyId ||
    joinRequestCompanyId ||
    null;

  if (!companyId) {
    return null;
  }

  return {
    contractorId: null,
    contractorName: metadata.name || user.email,
    companyId,
    email: user.email,
    userType: 'admin_staff',
  };
};

const resolveAuthUserProfile = async (user, accessToken) => {
  const metadata = user?.user_metadata || {};
  const userType = metadata.user_type || 'contractor';

  if (userType === 'admin_staff') {
    return resolveAdminStaffProfile(user);
  }

  // Always resolve contractor company from the database — JWT metadata can be stale
  // after join approval, re-invite, or duplicate contractor rows for the same email.
  const contractorData = await enrichProfileFromContractorTable(user, accessToken);
  if (contractorData) {
    if (contractorData.user_type === 'admin_staff') {
      return resolveAdminStaffProfile(user);
    }

    if (!contractorBelongsToAuthUser(contractorData, user)) {
      console.error(
        '❌ Contractor row email does not match authenticated user:',
        user.email,
        contractorData.email
      );
      return null;
    }

    return {
      contractorId: contractorData.id,
      contractorName: contractorData.name,
      companyId: contractorData.company_id,
      email: user.email,
      userType,
    };
  }

  // Company contacts (accreditation invites) — admin staff, no contractors row required
  if (metadata.user_type === 'admin_staff' && metadata.company_id) {
    return resolveAdminStaffProfile(user);
  }

  const joinRequest = await getApprovedJoinRequest(user.email);
  if (joinRequest?.company_id) {
    const joinUserType =
      joinRequest.user_type ||
      (joinRequest.will_work_on_site === false ? 'admin_staff' : 'contractor');
    return {
      contractorId: null,
      contractorName: metadata.name || user.email,
      companyId: joinRequest.company_id,
      email: user.email,
      userType: joinUserType,
    };
  }

  const companyIdForEmail = await getCompanyIdForAuthEmailClient(user.email);
  if (companyIdForEmail) {
    return {
      contractorId: null,
      contractorName: metadata.name || user.email,
      companyId: companyIdForEmail,
      email: user.email,
      userType: 'admin_staff',
    };
  }

  return null;
};

/**
 * Login with email and password
 * @param {string} email - Contractor email
 * @param {string} password - Contractor password
 * @returns {Object} { success: boolean, data: { user, contractor_id, contractor_name, company_id }, error: string }
 */
export async function loginWithEmailPassword(email, password) {
  try {
    const normalizedEmail = normalizeEmailInput(email);
    const { data: authData, error: authError } = await signInWithEmailCaseInsensitive(
      normalizedEmail,
      password
    );

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Login failed' };
    }

    if (
      authData.user.email &&
      normalizeEmailForComparison(authData.user.email) !== normalizeEmailForComparison(normalizedEmail)
    ) {
      console.error(
        '❌ Refusing login — authenticated as wrong user:',
        authData.user.email,
        'expected:',
        normalizedEmail
      );
      await supabase.auth.signOut();
      return { success: false, error: 'Password or username incorrect' };
    }

    console.log('✅ Auth sign in successful for:', authData.user.email);
    console.log('👤 User type from metadata:', authData.user.user_metadata?.user_type);

    const profile = await resolveAuthUserProfile(
      authData.user,
      authData.session?.access_token
    );

    if (!profile) {
      console.error('❌ Could not resolve profile for authenticated user:', authData.user.email);
      return {
        success: false,
        error: 'Your contractor account is not set up. Please contact your administrator.',
      };
    }

    if (!profile.contractorId && !profile.companyId && profile.userType !== 'admin_staff') {
      console.error('❌ Authenticated user has no contractor profile:', normalizedEmail);
      return {
        success: false,
        error: 'Your contractor account is not set up. Please contact your administrator.',
      };
    }

    return {
      success: true,
      data: {
        user: authData.user,
        contractorId: profile.contractorId,
        contractorName: profile.contractorName,
        companyId: profile.companyId,
        email: authData.user.email,
        userType: profile.userType,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new contractor account (signup)
 * @param {string} email - Contractor email
 * @param {string} password - Contractor password
 * @returns {Object} { success: boolean, data: user, error: string }
 */
export async function signupContractor(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data.user };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Logout current user
 */
export async function logout() {
  try {
    clearContractorSessionStorage();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is already logged in
 */
export async function getCurrentUser() {
  try {
    if (!supabase) {
      return { success: false, user: null };
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { success: false, user: null };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const profile = await resolveAuthUserProfile(user, session?.access_token);

    if (!profile) {
      return { success: false, user };
    }

    return {
      success: true,
      user,
      contractor: {
        id: profile.contractorId,
        name: profile.contractorName,
        company_id: profile.companyId,
        email: user.email,
        userType: profile.userType,
      },
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, user: null };
  }
}

/**
 * Invite contractor as new user (Admin action)
 * Creates auth user and sends invitation email
 * @param {string} email - Contractor email
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function inviteContractor(email) {
  try {
    // First check if this email exists in the contractors table
    console.log('🔐 Inviting contractor:', email);
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, email, name')
      .ilike('email', normalizeEmailInput(email))
      .maybeSingle();

    if (contractorError || !contractorData) {
      return { 
        success: false, 
        error: 'Email not found in contractor list. Please add them first.' 
      };
    }

    console.log('✅ Contractor found in table:', contractorData.name);

    // Try to call Edge Function to invite user (creates auth user)
    console.log('📧 Calling Edge Function to invite user...');
    const inviteResponse = await supabase.functions.invoke('invite-contractor', {
      body: {
        email: email,
        redirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/sign-in-contractor/`
          : 'https://contractorhq.co.nz/sign-in-contractor/'
      }
    }).catch(err => ({ error: err, data: null }));

    if (inviteResponse.error) {
      console.error('❌ Edge Function error:', inviteResponse.error);
      return {
        success: false,
        error: 'Unable to send invitation. Please try again or contact support.'
      };
    }

    if (!inviteResponse.data?.success) {
      console.error('❌ Invitation failed:', inviteResponse.data?.error);
      return {
        success: false,
        error: inviteResponse.data?.error ||  'Failed to send invitation'
      };
    }

    console.log('✅ Contractor invited successfully');
    return { 
      success: true, 
      message: `Invitation email sent to ${email}. They will receive a link to set their password.`
    };
  } catch (error) {
    console.error('❌ Invitation error:', error);
    return { 
      success: false, 
      error: error.message || 'An error occurred while sending invitation'
    };
  }
}

/**
 * Send password reset CODE to existing contractor (Self-service)
 * User will receive OTP code via email
 * @param {string} email - Contractor email
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function sendPasswordResetCode(email) {
  try {
    const normalizedEmail = normalizeEmailInput(email);
    console.log('🔑 Sending password reset code to:', normalizedEmail);

    const response = await fetch('/api/request-contractor-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to send password reset code',
      };
    }

    console.log('✅ Password reset code sent successfully');
    return {
      success: true,
      email: result.email || normalizedEmail,
      message:
        result.message ||
        `Password reset code has been sent to ${result.email || normalizedEmail}. The code is valid for 48 hours.`,
    };
  } catch (error) {
    console.error('❌ Password reset error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred',
    };
  }
}

/**
 * Legacy function - now sendPasswordResetCode instead
 */
export async function sendPasswordResetEmail(email) {
  return sendPasswordResetCode(email);
}

/**
 * Verify OTP code and authenticate user for password reset
 * @param {string} email - Contractor email
 * @param {string} token - OTP code from email
 * @returns {Object} { success: boolean, error: string }
 */
export async function verifyPasswordResetOtp(email, token) {
  try {
    const normalizedEmail = normalizeEmailInput(email);
    console.log('Verifying reset code for email:', normalizedEmail);

    const response = await fetch('/api/verify-contractor-reset-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        token: token.replace(/\s/g, ''),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      console.error('Reset code verification error:', result.error);
      return {
        success: false,
        error: result.error || 'Invalid or expired code',
      };
    }

    console.log('✅ Reset code verified successfully');
    return {
      success: true,
      email: result.email || normalizedEmail,
    };
  } catch (error) {
    console.error('OTP verification exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred',
    };
  }
}

export async function resetContractorPasswordWithToken(email, token, password) {
  try {
    const normalizedEmail = normalizeEmailInput(email);
    const response = await fetch('/api/reset-contractor-password-with-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        token: token.replace(/\s/g, ''),
        password,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to reset password',
      };
    }

    return {
      success: true,
      email: result.email || normalizedEmail,
      message: result.message || 'Password reset successfully',
    };
  } catch (error) {
    console.error('Password reset exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred',
    };
  }
}

export async function resolveContractorAuthEmail(email) {
  return resolveAuthEmailForLogin(email);
}

/**
 * Get all contractors for contractor name selection (legacy - kept for compatibility)
 */
export async function getAllContractors() {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, name, company_id')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return { success: false, error: error.message };
  }
}

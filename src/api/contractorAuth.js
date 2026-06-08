/**
 * Contractor Authentication API
 * Handles email/password login for contractors
 */

import { supabase } from '../supabaseClient';

const getJoinRequestCompanyId = async (email) => {
  if (!supabase || !email) {
    return null;
  }

  const { data: joinRequest } = await supabase
    .from('contractor_join_requests')
    .select('company_id')
    .ilike('email', email.trim())
    .eq('status', 'approved')
    .maybeSingle();

  return joinRequest?.company_id || null;
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

const lookupContractorByEmail = async (email) => {
  if (!supabase || !email) {
    return null;
  }

  const normalizedEmail = email.trim();
  const { data: exactMatch, error: exactError } = await supabase
    .from('contractors')
    .select('id, name, company_id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (exactError) {
    console.warn('⚠️ Contractor exact lookup error:', exactError.message);
  }

  if (exactMatch) {
    return exactMatch;
  }

  const { data: caseInsensitiveMatch, error: ilikeError } = await supabase
    .from('contractors')
    .select('id, name, company_id, email')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (ilikeError) {
    console.warn('⚠️ Contractor ilike lookup error:', ilikeError.message);
  }

  return caseInsensitiveMatch || null;
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
      const error = await response.json().catch(() => ({}));
      console.warn('⚠️ Server contractor lookup failed:', error.error || response.status);
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
  const emailContractor = await lookupContractorByEmail(user.email);
  if (emailContractor) {
    return emailContractor;
  }

  const apiContractor = await lookupContractorViaApi(accessToken);
  if (!apiContractor) {
    return null;
  }

  return apiContractor;
};

const resolveAuthUserProfile = async (user, accessToken) => {
  const authProfile = buildProfileFromAuthUser(user);

  if (authProfile?.isComplete) {
    return authProfile;
  }

  const contractorData = await enrichProfileFromContractorTable(user, accessToken);
  if (contractorData) {
    return {
      contractorId: contractorData.id,
      contractorName: contractorData.name,
      companyId: contractorData.company_id,
      email: contractorData.email || user.email,
      userType: user.user_metadata?.user_type || 'contractor',
    };
  }

  if (authProfile) {
    if (authProfile.userType === 'admin_staff' && !authProfile.companyId) {
      const companyId = await getJoinRequestCompanyId(user.email);
      if (companyId) {
        return { ...authProfile, companyId };
      }
    }

    if (authProfile.companyId) {
      return authProfile;
    }
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
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Login failed' };
    }

    console.log('✅ Auth sign in successful for:', email);
    console.log('👤 User type from metadata:', authData.user.user_metadata?.user_type);

    const profile = await resolveAuthUserProfile(
      authData.user,
      authData.session?.access_token
    );

    if (!profile) {
      console.error('❌ Could not resolve profile for authenticated user:', email);
      return {
        success: false,
        error: 'Your contractor account is not set up. Please contact your administrator.',
      };
    }

    if (!profile.companyId && profile.userType !== 'admin_staff') {
      console.error('❌ Authenticated user has no company profile:', email);
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
        email: profile.email,
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
        email: profile.email,
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
      .eq('email', email)
      .single();

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
    console.log('🔑 Sending password reset code to:', email);
    
    // Don't require contractor record to exist - just send the email
    // This supports newly approved contractors who may not be fully set up yet
    
    // Send password reset code via Supabase (sends 6-digit OTP)
    console.log('📧 Sending password reset code via Supabase');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback` 
        : 'https://contractorhq.co.nz/auth/callback'
    });

    if (resetError) {
      console.error('❌ Reset email error:', resetError);
      return { 
        success: false, 
        error: resetError.message || 'Failed to send password reset code' 
      };
    }

    console.log('✅ Password reset code sent successfully');
    return { 
      success: true, 
      message: `Password reset code has been sent to ${email}. Check your email for a 6-digit code.`
    };
  } catch (error) {
    console.error('❌ Password reset error:', error);
    return { 
      success: false, 
      error: error.message || 'An error occurred' 
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
    console.log('Verifying OTP for email:', email);
    
    // Verify the OTP token for recovery (password reset)
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: token.replace(/\s/g, ''), // Remove spaces
      type: 'recovery'
    });

    if (error) {
      console.error('OTP verification error:', error);
      return { 
        success: false, 
        error: error.message || 'Invalid or expired code'
      };
    }

    if (!data.session) {
      console.error('No session created after OTP verification');
      return { 
        success: false, 
        error: 'Authentication failed. Please try again.'
      };
    }

    console.log('✅ OTP verified successfully, session established');
    return { success: true };
  } catch (error) {
    console.error('OTP verification exception:', error);
    return { 
      success: false, 
      error: error.message || 'An error occurred'
    };
  }
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

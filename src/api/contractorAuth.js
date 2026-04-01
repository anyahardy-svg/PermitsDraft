/**
 * Contractor Authentication API
 * Handles email/password login for contractors
 */

import { supabase } from '../supabaseClient';

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

    // Get contractor info from contractors table using the user's email
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, name, company_id, email')
      .eq('email', email)
      .single();

    if (contractorError) {
      // User exists in auth but not in contractors table
      console.error('Contractor record not found:', contractorError);
      return { 
        success: false, 
        error: 'Your contractor account is not set up. Please contact your administrator.' 
      };
    }

    return { 
      success: true, 
      data: {
        user: authData.user,
        contractorId: contractorData.id,
        contractorName: contractorData.name,
        companyId: contractorData.company_id,
        email: contractorData.email
      }
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

    // Get contractor info
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, name, company_id, email')
      .eq('email', user.email)
      .single();

    if (contractorError) {
      return { success: false, user: null };
    }

    return {
      success: true,
      user,
      contractor: {
        id: contractorData.id,
        name: contractorData.name,
        company_id: contractorData.company_id,
        email: contractorData.email
      }
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
          ? window.location.origin
          : 'https://contractorhq.co.nz'
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
 * User will receive OTP code via email, not a magic link
 * @param {string} email - Contractor email
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function sendPasswordResetCode(email) {
  try {
    console.log('🔑 Sending password reset code to:', email);
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (contractorError || !contractorData) {
      return { 
        success: false, 
        error: 'Email not found in our system. Please contact your administrator.' 
      };
    }

    // For password reset, use resetPasswordForEmail which sends recovery token
    // This will send it as a 6-digit code (per email template)
    console.log('📧 Sending recovery code via resetPasswordForEmail');
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
      message: `Password reset code has been sent to ${email}. Check your inbox for a 6-digit code and enter it below.`
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

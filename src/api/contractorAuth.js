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
 * Send password reset/setup email to contractor using OTP (One-Time Password)
 * OTP prevents token consumption by email security scanners
 * @param {string} email - Contractor email
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function sendPasswordResetEmail(email) {
  try {
    // First check if this email exists in the contractors table
    console.log('Checking for contractor email:', email);
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, email, name')
      .eq('email', email)
      .single();

    console.log('Contractor lookup result:', { contractorData, contractorError });

    if (contractorError || !contractorData) {
      console.log('Email not found - returning error');
      return { 
        success: false, 
        error: 'Email not found in our system. Please contact your administrator.' 
      };
    }

    console.log('Contractor found, sending OTP reset email');

    // Send password reset OTP via Supabase Auth
    // This sends a one-time password code instead of a magic link
    // OTP is not consumed by email security scanners since it requires manual entry
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Don't automatically create a session; just send the OTP
        shouldCreateUser: false,
        // Custom messaging in email if supported
        emailRedirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/callback` 
          : 'https://contractorhq.co.nz/auth/callback'
      }
    });

    if (otpError) {
      console.error('OTP send error:', otpError);
      return { 
        success: false, 
        error: otpError.message || 'Failed to send password reset code' 
      };
    }

    return { 
      success: true, 
      message: `Password reset code has been sent to ${email}. Check your inbox for a 6-digit code and enter it in the form below.`
    };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { 
      success: false, 
      error: error.message || 'An error occurred' 
    };
  }
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

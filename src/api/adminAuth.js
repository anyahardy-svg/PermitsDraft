/**
 * Admin User Authentication & Management API
 * Handles admin login, password validation, and user CRUD operations
 */

import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';

/**
 * Login admin user with email and password
 * @param {string} email - Admin email
 * @param {string} password - Admin password (plaintext)
 * @returns {Object} { success: boolean, data: { id, email, name, role }, error: string }
 */
export async function loginAdminUser(email, password) {
  try {
    console.log('🔐 Admin login attempt:', email);

    // Query admin_users table
    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, email, password_hash, name, role')
      .eq('email', email)
      .single();

    if (fetchError || !adminUser) {
      console.error('❌ Admin user not found:', email);
      return {
        success: false,
        error: 'Password or username incorrect'
      };
    }

    // Compare passwords using bcrypt
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);

    if (!passwordMatch) {
      console.error('❌ Password mismatch for:', email);
      return {
        success: false,
        error: 'Password or username incorrect'
      };
    }

    console.log('✅ Admin login successful:', email, 'Role:', adminUser.role);
    return {
      success: true,
      data: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      }
    };
  } catch (error) {
    console.error('❌ Admin login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed'
    };
  }
}

/**
 * Get all admin users (super_admin only)
 * @returns {Array} List of admin users
 */
export async function getAllAdminUsers() {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching admin users:', error);
    throw error;
  }
}

/**
 * Create a new admin user (super_admin only)
 * @param {string} email - Admin email
 * @param {string} name - Admin name
 * @param {string} password - Admin password (plaintext) - optional, can be null for first-time setup
 * @param {string} role - 'super_admin' or 'manager'
 * @returns {Object} { success: boolean, data: user, error: string }
 */
export async function createAdminUser(email, name, password, role = 'manager') {
  try {
    console.log('👤 Creating admin user:', email, 'Role:', role);

    // Validate inputs
    if (!email || !name) {
      return {
        success: false,
        error: 'Email and name are required'
      };
    }

    if (!['super_admin', 'manager'].includes(role)) {
      return {
        success: false,
        error: 'Invalid role. Must be super_admin or manager'
      };
    }

    // Hash password if provided, otherwise set to empty string (user will set on first login)
    let passwordHash = '';
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Insert into admin_users
    const { data, error } = await supabase
      .from('admin_users')
      .insert([
        {
          email,
          name,
          password_hash: passwordHash,
          role
        }
      ])
      .select('id, email, name, role')
      .single();

    if (error) throw error;

    console.log('✅ Admin user created:', email);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    return {
      success: false,
      error: error.message || 'Failed to create admin user'
    };
  }
}

/**
 * Update an admin user (super_admin only)
 * @param {string} userId - Admin user ID to update
 * @param {Object} updates - { name?, role?, password? }
 * @returns {Object} { success: boolean, data: user, error: string }
 */
export async function updateAdminUser(userId, updates) {
  try {
    console.log('✏️ Updating admin user:', userId);

    const updateData = {};

    if (updates.name) {
      updateData.name = updates.name;
    }

    if (updates.role && ['super_admin', 'manager'].includes(updates.role)) {
      updateData.role = updates.role;
    }

    if (updates.password) {
      updateData.password_hash = await bcrypt.hash(updates.password, 10);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, role')
      .single();

    if (error) throw error;

    console.log('✅ Admin user updated:', userId);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('❌ Error updating admin user:', error);
    return {
      success: false,
      error: error.message || 'Failed to update admin user'
    };
  }
}

/**
 * Delete an admin user (super_admin only)
 * @param {string} userId - Admin user ID to delete
 * @returns {Object} { success: boolean, error: string }
 */
export async function deleteAdminUser(userId) {
  try {
    console.log('🗑️ Deleting admin user:', userId);

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    console.log('✅ Admin user deleted:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting admin user:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete admin user'
    };
  }
}

/**
 * Change admin password
 * @param {string} userId - Admin user ID
 * @param {string} currentPassword - Current password (for verification)
 * @param {string} newPassword - New password
 * @returns {Object} { success: boolean, error: string }
 */
export async function changeAdminPassword(userId, currentPassword, newPassword) {
  try {
    console.log('🔐 Changing password for user:', userId);

    // Get current password hash
    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !adminUser) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, adminUser.password_hash);

    if (!passwordMatch) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log('✅ Password changed for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error changing password:', error);
    return {
      success: false,
      error: error.message || 'Failed to change password'
    };
  }
}

/**
 * Check if an admin user needs to set their password
 * @param {string} email - Admin email
 * @returns {Object} { needsSetup: boolean, adminId: string }
 */
export async function checkAdminPasswordSetup(email) {
  try {
    console.log('🔍 Checking password setup for:', email);
    
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, password_hash')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ Error fetching admin user:', error);
      return { needsSetup: false };
    }

    if (!adminUser) {
      console.log('⚠️ Admin user not found:', email);
      return { needsSetup: false };
    }

    // Check if password_hash is null or empty
    const needsSetup = !adminUser.password_hash || adminUser.password_hash.trim() === '';

    console.log(`✅ Admin user found - Needs password setup: ${needsSetup}`);

    return {
      needsSetup,
      adminId: adminUser.id,
      email
    };
  } catch (error) {
    console.error('❌ Error checking password setup:', error);
    return { needsSetup: false };
  }
}

/**
 * Request password reset by generating a reset token for admin email
 * @param {string} email - Admin email
 * @returns {Object} { success: boolean, resetUrl: string, error: string }
 */
export async function requestPasswordReset(email) {
  try {
    console.log('🔐 Password reset requested for:', email);

    // Find admin by email
    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (fetchError || !adminUser) {
      console.log('ℹ️ No admin user found for:', email);
      // Don't reveal if email exists or not (security best practice)
      return {
        success: true,
        note: 'If email exists, a reset link will be sent'
      };
    }

    // Generate random token (32 character hex string)
    const token = crypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');

    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    console.log('🔑 Generated reset token for:', adminUser.id);

    // Save token to database
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        password_reset_token: token,
        password_reset_token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id);

    if (updateError) {
      console.error('❌ Failed to save reset token:', updateError);
      return {
        success: false,
        error: 'Failed to process reset request'
      };
    }

    // Build reset URL (includes token)
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.REACT_APP_BASE_URL || 'https://base-url.com';
    
    const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;

    console.log('✅ Password reset token generated and saved');
    return {
      success: true,
      resetUrl,
      email: adminUser.email
    };
  } catch (error) {
    console.error('❌ Error in requestPasswordReset:', error);
    return {
      success: false,
      error: 'An error occurred while processing your request'
    };
  }
}

/**
 * Reset admin password using a valid reset token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password (plaintext)
 * @returns {Object} { success: boolean, error: string }
 */
export async function resetPasswordWithToken(token, newPassword) {
  try {
    console.log('🔐 Attempting password reset with token');

    if (!token || !newPassword) {
      return {
        success: false,
        error: 'Invalid reset request'
      };
    }

    // Find admin by reset token
    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, email, password_reset_token_expires_at')
      .eq('password_reset_token', token)
      .single();

    if (fetchError || !adminUser) {
      console.error('❌ Invalid reset token');
      return {
        success: false,
        error: 'Invalid or expired reset link'
      };
    }

    // Check if token has expired
    const expiresAt = new Date(adminUser.password_reset_token_expires_at);
    if (expiresAt < new Date()) {
      console.error('❌ Reset token expired');
      return {
        success: false,
        error: 'Reset link has expired. Please request a new one.'
      };
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    console.log('🔑 Hashing new password for admin:', adminUser.email);

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id);

    if (updateError) {
      console.error('❌ Failed to update password:', updateError);
      return {
        success: false,
        error: 'Failed to update password'
      };
    }

    console.log('✅ Password reset successful for:', adminUser.email);
    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  } catch (error) {
    console.error('❌ Error in resetPasswordWithToken:', error);
    return {
      success: false,
      error: 'An error occurred while resetting your password'
    };
  }
}

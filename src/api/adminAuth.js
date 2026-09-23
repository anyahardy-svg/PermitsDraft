/**
 * Admin User Authentication & Management API
 * Handles admin login, password validation, and user CRUD operations
 */

import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';
import { normalizeEmailInput, normalizeEmailForComparison } from '../utils/emailNormalization';
import { getPublicAppOrigin } from '../utils/publicAppOrigin';
import { buildAdminPasswordSetupUrl } from '../utils/adminSetupRoute';
import { sendAdminSetupEmail } from './sendgrid';

const isMissingSiteIdsColumn = (error) =>
  error?.message?.includes('site_ids') || error?.details?.includes('site_ids');

async function invokeAdminAuth(payload) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase client is not configured' } };
  }

  const { data, error } = await supabase.functions.invoke('admin-auth', { body: payload });

  if (error) {
    let responseBody = data;
    if (!responseBody && error?.context && typeof error.context.json === 'function') {
      try {
        responseBody = await error.context.json();
      } catch (parseError) {
        console.warn('Could not parse admin-auth error body:', parseError);
      }
    }
    if (responseBody && typeof responseBody === 'object') {
      return { data: responseBody, error: null };
    }
    return { data: null, error };
  }

  return { data, error: null };
}

async function findAdminUserByEmail(email, selectFields, fallbackSelectFields = null) {
  const normalizedEmail = normalizeEmailInput(email);
  if (!normalizedEmail) {
    return { data: null, error: { message: 'Missing email' } };
  }

  let result = await supabase
    .from('admin_users')
    .select(selectFields)
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (result.error && isMissingSiteIdsColumn(result.error) && fallbackSelectFields) {
    result = await supabase
      .from('admin_users')
      .select(fallbackSelectFields)
      .ilike('email', normalizedEmail)
      .maybeSingle();
  }

  return result;
}

/**
 * Login admin user with email and password
 * @param {string} email - Admin email
 * @param {string} password - Admin password (plaintext)
 * @returns {Object} { success: boolean, data: { id, email, name, role }, error: string }
 */
export async function loginAdminUser(email, password) {
  try {
    const normalizedEmail = normalizeEmailForComparison(email);
    console.log('🔐 Admin login attempt:', normalizedEmail);

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'login',
      email: normalizedEmail,
      password,
    });

    if (invokeError || !result?.success) {
      console.error('❌ Admin login failed:', normalizedEmail, invokeError || result?.error);
      if (result?.needsPasswordSetup) {
        return {
          success: false,
          needsPasswordSetup: true,
          adminId: result.adminId,
          email: result.email || normalizedEmail,
          error: result.error || 'You need to set your password before you can sign in.',
        };
      }
      if (result?.loginSystemMisconfigured && result?.adminMessage) {
        return {
          success: false,
          error: result.adminMessage,
        };
      }
      return {
        success: false,
        error: result?.error || invokeError?.message || 'Password or username incorrect',
      };
    }

    console.log('✅ Admin login successful:', result.data?.email, 'Role:', result.data?.role);
    return {
      success: true,
      data: result.data,
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
/**
 * Kiosk visiting-person lookup: admins assigned to one site only.
 * Avoids downloading password hashes or unrelated admin users.
 */
export async function listAdminUsersForKioskSite(siteId) {
  if (!siteId) {
    return [];
  }

  try {
    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'listForKioskSite',
      siteId,
    });

    if (!invokeError && result?.success && Array.isArray(result.data)) {
      return result.data;
    }

    let { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, site_ids')
      .contains('site_ids', [siteId])
      .order('name', { ascending: true });

    if (error && isMissingSiteIdsColumn(error)) {
      const retry = await supabase
        .from('admin_users')
        .select('id, email, name, role')
        .order('name', { ascending: true });
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return (data || [])
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        site_ids: user.site_ids || [],
        siteIds: user.site_ids || [],
      }))
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
  } catch (error) {
    console.error('❌ Error fetching kiosk admin users:', error);
    throw error;
  }
}

export async function getAllAdminUsers(requestingAdminId) {
  try {
    if (!requestingAdminId) {
      console.warn('getAllAdminUsers: missing requestingAdminId');
      return [];
    }

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'listAll',
      requestingAdminId,
    });

    if (!invokeError && result?.success && Array.isArray(result.data)) {
      return result.data.sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );
    }

    if (invokeError || result?.error) {
      throw new Error(result?.error || invokeError?.message || 'Failed to load admin users');
    }

    return [];
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
export async function createAdminUser(email, name, password, role = 'manager', siteIds = [], requestingAdminId) {
  try {
    console.log('👤 Creating admin user:', email, 'Role:', role);

    if (!requestingAdminId) {
      return { success: false, error: 'Not signed in' };
    }

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

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'createAdmin',
      requestingAdminId,
      email: normalizeEmailForComparison(email),
      name,
      password: password || '',
      role,
      siteIds: siteIds || [],
    });

    if (invokeError || !result?.success) {
      return {
        success: false,
        error: result?.error || invokeError?.message || 'Failed to create admin user',
      };
    }

    console.log('✅ Admin user created:', email);
    return { success: true, data: result.data };
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
 * @param {Object} updates - { email?, name?, role?, password?, siteIds? }
 * @returns {Object} { success: boolean, data: user, error: string }
 */
export async function updateAdminUser(userId, updates, requestingAdminId) {
  try {
    console.log('✏️ Updating admin user:', userId);

    if (!requestingAdminId) {
      return { success: false, error: 'Not signed in' };
    }

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'updateAdmin',
      requestingAdminId,
      userId,
      updates: {
        ...updates,
        email: updates.email !== undefined ? normalizeEmailForComparison(updates.email) : undefined,
      },
    });

    if (invokeError || !result?.success) {
      const message = result?.error || invokeError?.message || 'Failed to update admin user';
      const friendlyError =
        message.includes('admin_users_email_key') || message.includes('duplicate key')
          ? 'An admin with this email already exists'
          : message;
      return { success: false, error: friendlyError };
    }

    console.log('✅ Admin user updated:', userId);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Error updating admin user:', error);
    const message = error.message || 'Failed to update admin user';
    return { success: false, error: message };
  }
}

/**
 * Delete an admin user (super_admin only)
 * @param {string} userId - Admin user ID to delete
 * @returns {Object} { success: boolean, error: string }
 */
export async function deleteAdminUser(userId, requestingAdminId) {
  try {
    console.log('🗑️ Deleting admin user:', userId);

    if (!requestingAdminId) {
      return { success: false, error: 'Not signed in' };
    }

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'deleteAdmin',
      requestingAdminId,
      userId,
    });

    if (invokeError || !result?.success) {
      return {
        success: false,
        error: result?.error || invokeError?.message || 'Failed to delete admin user',
      };
    }

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
    const normalizedEmail = normalizeEmailForComparison(email);
    console.log('🔍 Checking password setup for:', normalizedEmail);

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'checkPasswordSetup',
      email: normalizedEmail,
    });

    if (!invokeError && result && typeof result.needsSetup === 'boolean') {
      console.log(`✅ Admin user found - Needs password setup: ${result.needsSetup}`);
      return {
        needsSetup: result.needsSetup,
        adminId: result.adminId,
        email: result.email,
      };
    }

    const { data: adminUser, error } = await findAdminUserByEmail(
      normalizedEmail,
      'id, email, password_hash'
    );

    if (error) {
      console.error('❌ Error fetching admin user:', error);
      return { needsSetup: false };
    }

    if (!adminUser) {
      console.log('⚠️ Admin user not found:', normalizedEmail);
      return { needsSetup: false };
    }

    const needsSetup = !adminUser.password_hash || adminUser.password_hash.trim() === '';

    console.log(`✅ Admin user found - Needs password setup: ${needsSetup}`);

    return {
      needsSetup,
      adminId: adminUser.id,
      email: adminUser.email,
    };
  } catch (error) {
    console.error('❌ Error checking password setup:', error);
    return { needsSetup: false };
  }
}

/**
 * Resend the admin/manager password setup email
 * @param {string} email - Admin email
 * @returns {Object} { success: boolean, message?: string, error?: string }
 */
export async function resendAdminSetupEmail(email, requestingAdminId) {
  try {
    const normalizedEmail = normalizeEmailForComparison(email);

    const { data: lookup, error: invokeError } = await invokeAdminAuth({
      action: 'getAdminByEmail',
      requestingAdminId,
      email: normalizedEmail,
    });

    if (invokeError || !lookup?.success || !lookup?.data) {
      return { success: false, error: lookup?.error || invokeError?.message || 'Admin user not found' };
    }

    const adminUser = lookup.data;
    if (!adminUser.needsPasswordSetup) {
      return {
        success: false,
        error: 'This user has already set their password. Use password reset instead.',
      };
    }

    const setupUrl = buildAdminPasswordSetupUrl(adminUser.email, adminUser.role);
    const emailResult = await sendAdminSetupEmail(adminUser.email, adminUser.name, setupUrl);

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || 'Failed to send setup email',
      };
    }

    return {
      success: true,
      message: `Setup email resent to ${adminUser.email}`,
    };
  } catch (error) {
    console.error('❌ Error resending admin setup email:', error);
    return {
      success: false,
      error: error.message || 'Failed to resend setup email',
    };
  }
}

/**
 * Request password reset by generating a reset token for admin email
 * @param {string} email - Admin email
 * @returns {Object} { success: boolean, resetUrl: string, error: string }
 */
export async function requestPasswordReset(email) {
  try {
    const normalizedEmail = normalizeEmailForComparison(email);
    console.log('🔐 Password reset requested for:', normalizedEmail);

    const appOrigin = getPublicAppOrigin(
      typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BASE_URL
    );

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'requestPasswordReset',
      email: normalizedEmail,
      appOrigin,
    });

    if (invokeError) {
      console.error('❌ requestPasswordReset invoke error:', invokeError);
      return { success: false, error: 'Failed to process reset request' };
    }

    if (!result?.success) {
      return {
        success: false,
        error: result?.error || 'Failed to process reset request',
      };
    }

    if (!result.resetUrl) {
      console.log('ℹ️ No admin user found for:', normalizedEmail);
      return {
        success: true,
        note: 'If email exists, a reset link will be sent',
      };
    }

    const resetUrl = result.resetUrl.startsWith('http')
      ? result.resetUrl
      : `${appOrigin}${result.resetUrl}`;

    console.log('✅ Password reset token generated and saved');
    return {
      success: true,
      resetUrl,
      email: result.email,
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

    const { data: result, error: invokeError } = await invokeAdminAuth({
      action: 'resetPasswordWithToken',
      token,
      newPassword,
    });

    if (invokeError || !result?.success) {
      return {
        success: false,
        error: result?.error || invokeError?.message || 'Failed to update password',
      };
    }

    console.log('✅ Password reset successful');
    return {
      success: true,
      message: result.message || 'Password has been reset successfully',
    };
  } catch (error) {
    console.error('❌ Error in resetPasswordWithToken:', error);
    return {
      success: false,
      error: 'An error occurred while resetting your password'
    };
  }
}

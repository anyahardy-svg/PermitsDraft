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
        error: 'Invalid email or password'
      };
    }

    // Compare passwords using bcrypt
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);

    if (!passwordMatch) {
      console.error('❌ Password mismatch for:', email);
      return {
        success: false,
        error: 'Invalid email or password'
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
 * @param {string} password - Admin password (plaintext)
 * @param {string} role - 'super_admin' or 'manager'
 * @returns {Object} { success: boolean, data: user, error: string }
 */
export async function createAdminUser(email, name, password, role = 'manager') {
  try {
    console.log('👤 Creating admin user:', email, 'Role:', role);

    // Validate inputs
    if (!email || !name || !password) {
      return {
        success: false,
        error: 'Email, name, and password are required'
      };
    }

    if (!['super_admin', 'manager'].includes(role)) {
      return {
        success: false,
        error: 'Invalid role. Must be super_admin or manager'
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

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
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, password_hash')
      .eq('email', email)
      .single();

    if (error || !adminUser) {
      return { needsSetup: false };
    }

    // Check if password_hash is null or empty
    const needsSetup = !adminUser.password_hash || adminUser.password_hash.trim() === '';

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

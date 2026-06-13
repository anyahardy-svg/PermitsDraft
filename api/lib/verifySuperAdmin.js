const bcrypt = require('bcryptjs');
const { getSupabaseAdmin } = require('../supabaseAdmin');

async function verifySuperAdmin(email, password) {
  try {
    const trimmedEmail = String(email || '').trim();
    const trimmedPassword = String(password || '');

    if (!trimmedEmail || !trimmedPassword) {
      return { ok: false, error: 'Email and password are required' };
    }

    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      return { ok: false, error: 'Server is not configured for admin verification' };
    }

    const { data: adminUsers, error } = await adminClient
      .from('admin_users')
      .select('id, email, password_hash, role')
      .ilike('email', trimmedEmail)
      .limit(5);

    if (error) {
      console.error('verifySuperAdmin lookup error:', error.message);
      return { ok: false, error: 'Could not verify admin credentials' };
    }

    const adminUser = (adminUsers || []).find(
      (candidate) => candidate.email?.toLowerCase() === trimmedEmail.toLowerCase()
    ) || adminUsers?.[0];

    if (!adminUser) {
      return { ok: false, error: 'Invalid admin credentials' };
    }

    if (adminUser.role !== 'super_admin') {
      return { ok: false, error: 'Only super admins can run this action' };
    }

    if (!adminUser.password_hash) {
      return { ok: false, error: 'Admin account is missing a password hash' };
    }

    const passwordMatch = await bcrypt.compare(trimmedPassword, adminUser.password_hash);
    if (!passwordMatch) {
      return { ok: false, error: 'Invalid admin credentials' };
    }

    return { ok: true, adminUser };
  } catch (error) {
    console.error('verifySuperAdmin error:', error);
    return { ok: false, error: 'Could not verify admin credentials' };
  }
}

module.exports = {
  verifySuperAdmin,
};

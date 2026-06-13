const bcrypt = require('bcryptjs');
const { getSupabaseAdmin } = require('../supabaseAdmin');

async function verifySuperAdmin(email, password) {
  const trimmedEmail = String(email || '').trim();
  const trimmedPassword = String(password || '');

  if (!trimmedEmail || !trimmedPassword) {
    return { ok: false, error: 'Email and password are required' };
  }

  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return { ok: false, error: 'Server is not configured for admin verification' };
  }

  const { data: adminUser, error } = await adminClient
    .from('admin_users')
    .select('id, email, password_hash, role')
    .ilike('email', trimmedEmail)
    .maybeSingle();

  if (error || !adminUser) {
    return { ok: false, error: 'Invalid admin credentials' };
  }

  if (adminUser.role !== 'super_admin') {
    return { ok: false, error: 'Only super admins can run this action' };
  }

  const passwordMatch = await bcrypt.compare(trimmedPassword, adminUser.password_hash);
  if (!passwordMatch) {
    return { ok: false, error: 'Invalid admin credentials' };
  }

  return { ok: true, adminUser };
}

module.exports = {
  verifySuperAdmin,
};

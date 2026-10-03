/**
 * Manager sign-in history search (service role, admin session id).
 *
 * POST /api/manager-sign-in-history
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');

function enrichSignInRecord(record) {
  const checkInTime = new Date(record.check_in_time);
  const checkOutTime = record.check_out_time ? new Date(record.check_out_time) : new Date();
  const durationMinutes = Math.round((checkOutTime - checkInTime) / 60000);
  const isContractor = Boolean(record.contractor_id);

  return {
    ...record,
    personType: isContractor ? 'Contractor' : 'Visitor',
    displayName: isContractor
      ? record.contractor_name || 'Unknown contractor'
      : record.visitor_name || 'Unknown visitor',
    displayCompany: isContractor ? record.contractor_company || '' : record.visitor_company || '',
    duration_minutes: durationMinutes,
  };
}

async function assertManagerAccess(requestingAdminId, siteId) {
  if (!requestingAdminId) {
    return { error: 'Manager admin session is required', status: 401 };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: 'Supabase service role is not configured on the server', status: 500 };
  }

  const { data: manager, error } = await admin
    .from('admin_users')
    .select('id, role, site_ids')
    .eq('id', requestingAdminId)
    .maybeSingle();

  if (error) {
    return { error: error.message, status: 500 };
  }
  if (!manager) {
    return { error: 'Invalid admin session', status: 403 };
  }

  const allowedSites = manager.site_ids;
  if (Array.isArray(allowedSites) && allowedSites.length > 0 && siteId) {
    if (!allowedSites.includes(siteId)) {
      return { error: 'You do not have access to this site', status: 403 };
    }
  }

  return { admin, manager };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    requestingAdminId,
    siteId,
    startDate,
    endDate,
    personQuery,
    companyQuery,
  } = req.body || {};

  if (!siteId) {
    return res.status(400).json({ error: 'siteId is required' });
  }

  const auth = await assertManagerAccess(requestingAdminId, siteId);
  if (auth.error) {
    return res.status(auth.status || 403).json({ error: auth.error });
  }

  const { admin } = auth;

  try {
    let query = admin.from('sign_ins').select('*').eq('site_id', siteId);

    if (startDate) {
      query = query.gte('check_in_time', startDate);
    }
    if (endDate) {
      query = query.lte('check_in_time', endDate);
    }

    const person = String(personQuery || '').trim();
    if (person) {
      query = query.or(`visitor_name.ilike.%${person}%,contractor_name.ilike.%${person}%`);
    }

    const company = String(companyQuery || '').trim();
    if (company) {
      query = query.or(`visitor_company.ilike.%${company}%,contractor_company.ilike.%${company}%`);
    }

    const { data, error } = await query.order('check_in_time', { ascending: false }).limit(500);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: (data || []).map(enrichSignInRecord),
    });
  } catch (error) {
    console.error('manager-sign-in-history error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Search failed' });
  }
}

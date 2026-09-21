/**
 * Kiosk contractor check-in via service role (reliable insert when anon RLS blocks sign_ins).
 *
 * POST /api/kiosk-check-in
 * Body: { contractorId, siteId, businessUnitId?, flagData?, rtData?, visitingPersonName?, contractorPhone? }
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');

function getExpiryStatus(expiryRaw) {
  if (!expiryRaw) return 'not_inducted';
  const expiry = new Date(expiryRaw);
  if (Number.isNaN(expiry.getTime())) return 'not_inducted';
  if (expiry < new Date()) return 'expired';
  return 'inducted';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Supabase service role is not configured on the server' });
  }

  try {
    const {
      contractorId,
      siteId,
      businessUnitId: businessUnitIdFromBody,
      flagData = null,
      rtData = null,
      visitingPersonName = null,
      contractorPhone = null,
    } = req.body || {};

    if (!contractorId || !siteId) {
      return res.status(400).json({ error: 'contractorId and siteId are required' });
    }

    const { data: site, error: siteError } = await admin
      .from('sites')
      .select('id, business_unit_id, name')
      .eq('id', siteId)
      .maybeSingle();

    if (siteError) {
      throw siteError;
    }

    const businessUnitId = businessUnitIdFromBody || site?.business_unit_id;
    if (!businessUnitId) {
      return res.status(400).json({
        error: 'Site business unit is not configured. Please contact your administrator.',
      });
    }

    const { data: contractor, error: contractorError } = await admin
      .from('contractors')
      .select('*')
      .eq('id', contractorId)
      .maybeSingle();

    if (contractorError) {
      throw contractorError;
    }
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    if (contractorPhone && String(contractorPhone).trim()) {
      const trimmed = String(contractorPhone).trim();
      const normalized = trimmed.startsWith('0') ? trimmed.substring(1) : trimmed;
      if (!contractor.phone || String(contractor.phone).trim() !== normalized) {
        await admin.from('contractors').update({ phone: normalized }).eq('id', contractorId);
      }
    }

    const { data: siteInduction } = await admin
      .from('contractor_inductions')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('site_id', siteId)
      .maybeSingle();

    let inductionStatus = 'not_inducted';
    let isInductedHere = false;
    let isExpired = false;
    let siteExpiry = null;

    if (siteInduction) {
      siteExpiry = siteInduction.expires_at;
      inductionStatus = getExpiryStatus(siteExpiry);
      isInductedHere = inductionStatus === 'inducted';
      isExpired = inductionStatus === 'expired';
    } else {
      const siteIds = contractor.site_ids || [];
      const onSite = Array.isArray(siteIds) && siteIds.includes(siteId);
      if (onSite && contractor.induction_expiry) {
        siteExpiry = contractor.induction_expiry;
        inductionStatus = getExpiryStatus(siteExpiry);
        isInductedHere = inductionStatus === 'inducted';
        isExpired = inductionStatus === 'expired';
      }
    }

    let companyName = 'Unknown';
    if (contractor.company_id) {
      const { data: company } = await admin
        .from('companies')
        .select('name')
        .eq('id', contractor.company_id)
        .maybeSingle();
      if (company?.name) {
        companyName = company.name;
      }
    }

    const signInData = {
      contractor_id: contractorId,
      contractor_name: contractor.name || 'Unknown',
      contractor_phone: contractorPhone || contractor.phone || null,
      site_id: siteId,
      business_unit_id: businessUnitId,
      contractor_company: companyName,
      check_in_time: new Date().toISOString(),
      inducted: isInductedHere,
      induction_status: isExpired ? 'induction_expired' : isInductedHere ? 'inducted' : 'not_inducted',
      inducted_at_site: siteInduction?.inducted_at || null,
      induction_expires_at: siteExpiry || null,
      visiting_person_name: visitingPersonName || null,
    };

    if (flagData) {
      signInData.flag_taken = flagData.taken || false;
      signInData.flag_name = flagData.taken ? flagData.name : null;
    }
    if (rtData) {
      signInData.rt_taken = rtData.taken || false;
      signInData.rt_name = rtData.taken ? rtData.name : null;
    }

    const { data, error } = await admin.from('sign_ins').insert(signInData).select().single();
    if (error) {
      throw error;
    }

    const expiryDate = siteExpiry ? new Date(siteExpiry).toLocaleDateString('en-NZ') : null;

    return res.status(200).json({
      success: true,
      data,
      inducted: isInductedHere,
      isExpired,
      expiryDate,
    });
  } catch (error) {
    console.error('kiosk-check-in error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Check-in failed',
    });
  }
};

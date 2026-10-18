/**
 * Standalone / public induction flows — contractor roster via service role
 * (when contractor-data Edge listForInduction is not deployed yet).
 *
 * POST /api/induction-contractors
 * Body: { action: "list" }
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');

const PAGE_SIZE = 1000;
const IN_QUERY_BATCH_SIZE = 200;

async function fetchAllContractors(admin) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from('contractors')
      .select('*')
      .order('name', { ascending: true })
      .range(from, to);
    if (error) {
      throw error;
    }
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }
  return rows;
}

async function attachCompanyNames(admin, contractors) {
  const companyIds = [
    ...new Set(
      (contractors || [])
        .map((row) => row.company_id)
        .filter(Boolean),
    ),
  ];
  const companyMap = {};
  for (let i = 0; i < companyIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = companyIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const { data, error } = await admin.from('companies').select('id, name').in('id', batch);
    if (error) {
      console.warn('induction-contractors: company name fetch failed', error.message);
      break;
    }
    for (const company of data || []) {
      companyMap[company.id] = company.name;
    }
  }
  return (contractors || []).map((row) => ({
    ...row,
    company_name: companyMap[row.company_id] || row.company_name || '',
  }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({
      success: false,
      error: 'Supabase service role is not configured on the server',
    });
  }

  try {
    const { action } = req.body || {};
    if (action !== 'list') {
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    const contractors = await fetchAllContractors(admin);
    const withCompanies = await attachCompanyNames(admin, contractors);
    return res.status(200).json({ success: true, data: withCompanies });
  } catch (error) {
    console.error('induction-contractors error:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to load contractors',
    });
  }
};

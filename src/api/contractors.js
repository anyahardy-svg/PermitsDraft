import { supabase } from '../supabaseClient';
import { fetchAllPaginated, IN_QUERY_BATCH_SIZE } from './pagination';
import {
  attachSiteInductionsToContractors,
  syncSiteInductionRecordsFromProgress,
} from './contractorInductions';
import { getSiteInductionStatus, isInductedAnywhere } from '../utils/siteInductionStatus';
import {
  contractorDataCreate,
  contractorDataDelete,
  contractorDataGet,
  contractorDataGetForKiosk,
  contractorDataListAll,
  contractorDataListByCompany,
  contractorDataListBySite,
  contractorDataListExpiredInductions,
  contractorDataListForKiosk,
  contractorDataSearchForKiosk,
  contractorDataUpdate,
  getRequestingAdminId,
  isAdminSessionActive,
} from './contractorData';

/** Prefer Edge when admin session or kiosk paths; fall back to PostgREST until Edge is deployed / if invoke fails. */
async function withContractorDataFallback(edgeFn, directFn, { label = 'contractor-data' } = {}) {
  try {
    return await edgeFn();
  } catch (edgeError) {
    console.warn(`⚠️ ${label} edge failed, using direct PostgREST fallback:`, edgeError?.message || edgeError);
    return await directFn();
  }
}

function mapEdgeRowsToApp(rows) {
  return (rows || []).map(transformContractor);
}

function shouldPreferContractorEdgeForAdmin() {
  return Boolean(getRequestingAdminId() || isAdminSessionActive());
}

const fetchCompanyNameMap = async (companyIds) => {
  const uniqueIds = [...new Set((companyIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const companyMap = {};
  for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', batch);

    if (error) throw error;

    for (const company of companies || []) {
      companyMap[company.id] = company.name;
    }
  }

  return companyMap;
};

const attachCompanyNames = async (contractors) => {
  const companyIds = (contractors || []).map((contractor) => contractor.company_id);
  let companyMap = {};

  try {
    companyMap = await fetchCompanyNameMap(companyIds);
  } catch (error) {
    console.warn('⚠️ Could not fetch company names for contractors:', error.message);
  }

  return (contractors || []).map((contractor) => ({
    ...contractor,
    company_name: companyMap[contractor.company_id] || contractor.company_name || '',
  }));
};

// Helper function to transform Supabase data to app format
const transformContractor = (dbContractor) => {
  // Get company name from either direct column or joined companies table
  const getCompanyName = () => {
    if (dbContractor.company_name) return dbContractor.company_name;
    if (dbContractor.companies && dbContractor.companies.name) return dbContractor.companies.name;
    return '';
  };
  
  return {
    id: dbContractor.id,
    name: dbContractor.name,
    email: dbContractor.email,
    phone: dbContractor.phone,
    companyId: dbContractor.company_id,
    company_id: dbContractor.company_id,
    companyName: getCompanyName(),
    company_name: getCompanyName(),
    businessUnitIds: dbContractor.business_unit_ids || [],
    business_unit_ids: dbContractor.business_unit_ids || [],
    inductionExpiry: dbContractor.induction_expiry,
    induction_expiry: dbContractor.induction_expiry,
    serviceIds: dbContractor.service_ids || [],
    service_ids: dbContractor.service_ids || [],
    services: dbContractor.services || [],
    serviceNames: dbContractor.service_names || [],
    service_names: dbContractor.service_names || [],
    siteIds: dbContractor.site_ids || [],
    site_ids: dbContractor.site_ids || [],
    createdAt: dbContractor.created_at,
    created_at: dbContractor.created_at,
  };
};

const createContractorDirect = async (contractorData) => {
  const dbData = {
    ...contractorData,
    service_ids: contractorData.service_ids || contractorData.serviceIds || contractorData.services || [],
  };

  const { data, error } = await supabase.from('contractors').insert([dbData]).select();
  if (error) throw error;

  const contractor = data[0];
  if (contractor?.company_id) {
    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', contractor.company_id)
        .single();
      if (company && !companyError) {
        contractor.company_name = company.name;
      }
    } catch (err) {
      console.warn('Could not fetch company for contractor:', err.message);
    }
  }

  return contractor ? transformContractor(contractor) : null;
};

// Create a new contractor
export const createContractor = async (contractorData) => {
  try {
    if (shouldPreferContractorEdgeForAdmin()) {
      return await withContractorDataFallback(
        () => contractorDataCreate(contractorData).then((row) => (row ? transformContractor(row) : null)),
        () => createContractorDirect(contractorData),
        { label: 'createContractor' },
      );
    }
    return await createContractorDirect(contractorData);
  } catch (error) {
    console.error('Error creating contractor:', error.message);
    throw error;
  }
};

const listContractorsDirect = async () => {
  const data = await fetchAllPaginated((from, to) =>
    supabase.from('contractors').select().order('name', { ascending: true }).range(from, to),
  );
  const contractorsWithCompanies = await attachCompanyNames(data);
  return contractorsWithCompanies.map(transformContractor);
};

// Get all contractors with company details
export const listContractors = async () => {
  try {
    if (shouldPreferContractorEdgeForAdmin()) {
      const transformed = await withContractorDataFallback(
        () => contractorDataListAll().then(mapEdgeRowsToApp),
        () => listContractorsDirect(),
        { label: 'listContractors' },
      );
      console.log('✅ Contractors loaded:', transformed.length);
      return transformed;
    }

    const transformed = await listContractorsDirect();
    console.log('✅ Raw contractors data from Supabase:', transformed.length, 'contractors');
    return transformed;
  } catch (error) {
    console.error('❌ Error fetching contractors:', error.message);
    throw error;
  }
};

const getContractorDirect = async (contractorId) => {
  const { data, error } = await supabase.from('contractors').select().eq('id', contractorId).single();
  if (error) throw error;

  if (data?.company_id) {
    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', data.company_id)
        .single();
      if (company && !companyError) {
        data.company_name = company.name;
      }
    } catch (err) {
      console.warn('Could not fetch company for contractor:', err.message);
    }
  }

  return data ? transformContractor(data) : null;
};

// Get a single contractor
export const getContractor = async (contractorId) => {
  try {
    if (shouldPreferContractorEdgeForAdmin()) {
      return await withContractorDataFallback(
        () => contractorDataGet(contractorId).then((row) => (row ? transformContractor(row) : null)),
        () => getContractorDirect(contractorId),
        { label: 'getContractor' },
      );
    }
    return await withContractorDataFallback(
      () => contractorDataGetForKiosk(contractorId).then((row) => (row ? transformContractor(row) : null)),
      () => getContractorDirect(contractorId),
      { label: 'getContractor-kiosk' },
    );
  } catch (error) {
    console.error('Error fetching contractor:', error.message);
    throw error;
  }
};

export const getContractorWithSiteInductions = async (contractorId) => {
  const contractor = await getContractor(contractorId);
  if (!contractor) {
    return null;
  }

  await syncSiteInductionRecordsFromProgress(contractorId);
  const [withSiteInductions] = await attachSiteInductionsToContractors([contractor]);
  return withSiteInductions;
};

const mapUpdatesToDb = (updates) => {
  const dbUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'serviceIds') {
      dbUpdates.service_ids = value;
    } else if (key === 'siteIds') {
      dbUpdates.site_ids = value;
    } else if (key === 'businessUnitIds') {
      dbUpdates.business_unit_ids = value;
    } else if (key === 'companyId') {
      dbUpdates.company_id = value;
    } else if (key === 'inductionExpiry') {
      dbUpdates.induction_expiry = value;
    } else {
      dbUpdates[key] = value;
    }
  }
  return dbUpdates;
};

const updateContractorDirect = async (contractorId, updates) => {
  const dbUpdates = mapUpdatesToDb(updates);
  const { data, error } = await supabase
    .from('contractors')
    .update(dbUpdates)
    .eq('id', contractorId)
    .select();
  if (error) throw error;

  const contractor = data[0];
  if (contractor?.company_id) {
    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', contractor.company_id)
        .single();
      if (company && !companyError) {
        contractor.company_name = company.name;
      }
    } catch (err) {
      console.warn('Could not fetch company for contractor:', err.message);
    }
  }

  return contractor ? transformContractor(contractor) : null;
};

// Update a contractor
export const updateContractor = async (contractorId, updates) => {
  try {
    if (shouldPreferContractorEdgeForAdmin()) {
      return await withContractorDataFallback(
        () =>
          contractorDataUpdate(contractorId, updates).then((row) => (row ? transformContractor(row) : null)),
        () => updateContractorDirect(contractorId, updates),
        { label: 'updateContractor' },
      );
    }
    return await updateContractorDirect(contractorId, updates);
  } catch (error) {
    console.error('Error updating contractor:', error.message);
    throw error;
  }
};

// Delete a contractor
export const deleteContractor = async (contractorId) => {
  try {
    if (shouldPreferContractorEdgeForAdmin()) {
      return await withContractorDataFallback(
        () => contractorDataDelete(contractorId),
        async () => {
          const { error } = await supabase.from('contractors').delete().eq('id', contractorId);
          if (error) throw error;
          return true;
        },
        { label: 'deleteContractor' },
      );
    }
    const { error } = await supabase.from('contractors').delete().eq('id', contractorId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting contractor:', error.message);
    throw error;
  }
};

const normalizePhoneForMatch = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '') || digits;
};

const normalizeNameForMatch = (name) => (name || '').trim().toLowerCase();

// Find an existing contractor within a specific company by email, name, or phone
export const findContractorInCompany = (contractors, { companyId, email, name, phone }) => {
  if (!companyId || !Array.isArray(contractors)) return null;

  const companyContractors = contractors.filter(
    (contractor) => (contractor.companyId || contractor.company_id) === companyId
  );

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const byEmail = companyContractors.find(
      (contractor) => contractor.email && contractor.email.toLowerCase() === normalizedEmail
    );
    if (byEmail) return byEmail;
  }

  if (name) {
    const normalizedName = normalizeNameForMatch(name);
    const byName = companyContractors.find(
      (contractor) => normalizeNameForMatch(contractor.name) === normalizedName
    );
    if (byName) return byName;
  }

  if (phone) {
    const normalizedPhone = normalizePhoneForMatch(phone);
    if (normalizedPhone) {
      const byPhone = companyContractors.find(
        (contractor) => normalizePhoneForMatch(contractor.phone) === normalizedPhone
      );
      if (byPhone) return byPhone;
    }
  }

  return null;
};

// Get contractors by company
export const listContractorsByCompany = async (companyId) => {
  try {
    if (shouldPreferContractorEdgeForAdmin()) {
      return await withContractorDataFallback(
        () => contractorDataListByCompany(companyId).then(mapEdgeRowsToApp),
        async () => {
          const data = await fetchAllPaginated((from, to) =>
            supabase
              .from('contractors')
              .select('*, companies(name)')
              .eq('company_id', companyId)
              .order('name', { ascending: true })
              .range(from, to),
          );
          return data.map(transformContractor);
        },
        { label: 'listContractorsByCompany' },
      );
    }

    const data = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('*, companies(name)')
        .eq('company_id', companyId)
        .order('name', { ascending: true })
        .range(from, to),
    );
    return data.map(transformContractor);
  } catch (error) {
    console.error('Error fetching contractors by company:', error.message);
    throw error;
  }
};

// Get contractors with expired inductions
export const listContractorsWithExpiredInductions = async () => {
  try {
    if (shouldPreferContractorEdgeForAdmin()) {
      return await withContractorDataFallback(
        () => contractorDataListExpiredInductions().then(mapEdgeRowsToApp),
        async () => {
          const today = new Date().toISOString().split('T')[0];
          const data = await fetchAllPaginated((from, to) =>
            supabase
              .from('contractors')
              .select('*, companies(name)')
              .lt('induction_expiry', today)
              .order('induction_expiry', { ascending: false })
              .range(from, to),
          );
          return data.map(transformContractor);
        },
        { label: 'listContractorsWithExpiredInductions' },
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const data = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('*, companies(name)')
        .lt('induction_expiry', today)
        .order('induction_expiry', { ascending: false })
        .range(from, to),
    );
    return data.map(transformContractor);
  } catch (error) {
    console.error('Error fetching contractors with expired inductions:', error.message);
    throw error;
  }
};

// Remove a contractor from a specific site (does not delete the contractor record)
export const removeContractorFromSite = async (contractorId, siteId) => {
  try {
    if (!contractorId || !siteId) {
      throw new Error('Contractor and site are required');
    }

    const contractor = await getContractor(contractorId);
    const existingSiteIds = contractor.site_ids || contractor.siteIds || [];

    if (!existingSiteIds.includes(siteId)) {
      return contractor;
    }

    await supabase
      .from('contractor_inductions')
      .delete()
      .eq('contractor_id', contractorId)
      .eq('site_id', siteId);

    return updateContractor(contractorId, {
      site_ids: existingSiteIds.filter((id) => id !== siteId),
    });
  } catch (error) {
    console.error('Error removing contractor from site:', error.message);
    throw error;
  }
};

const mergeUniqueContractors = (...lists) => {
  const byId = new Map();
  for (const list of lists) {
    for (const row of list || []) {
      if (row?.id) {
        byId.set(row.id, row);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

const fetchContractorsByCompanyIds = async (companyIds) => {
  const uniqueIds = [...new Set((companyIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const rows = [];
  for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const batchRows = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('*')
        .in('company_id', batch)
        .order('name', { ascending: true })
        .range(from, to)
    );
    rows.push(...batchRows);
  }

  return rows;
};

const fetchCompanyIdsForKioskSite = async (siteId, businessUnitId) => {
  const ids = new Set();

  const bySite = await fetchAllPaginated((from, to) =>
    supabase
      .from('companies')
      .select('id')
      .contains('site_ids', [siteId])
      .range(from, to)
  );
  (bySite || []).forEach((company) => ids.add(company.id));

  if (businessUnitId) {
    const byBusinessUnit = await fetchAllPaginated((from, to) =>
      supabase
        .from('companies')
        .select('id')
        .overlaps('business_unit_ids', [businessUnitId])
        .range(from, to)
    );
    (byBusinessUnit || []).forEach((company) => ids.add(company.id));
  }

  return Array.from(ids);
};

function escapeIlikePattern(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

function contractorMatchesKioskSignInSearch(contractor, siteId) {
  const siteIds = contractor.site_ids || contractor.siteIds || [];
  const onSite = Array.isArray(siteIds) && siteIds.includes(siteId);
  if (onSite) {
    return true;
  }

  const statusHere = getSiteInductionStatus(contractor, siteId);
  if (statusHere === 'inducted' || statusHere === 'expired') {
    return true;
  }

  return isInductedAnywhere(contractor);
}

const searchContractorsForKioskDirect = async (siteId, searchText, limit = 40) => {
  const trimmed = searchText?.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const pattern = `%${escapeIlikePattern(trimmed)}%`;

    const [
      { data: siteAssigned, error: siteError },
      { data: globalNameMatches, error: globalError },
    ] = await Promise.all([
      supabase
        .from('contractors')
        .select('*')
        .contains('site_ids', [siteId])
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .order('name', { ascending: true })
        .limit(limit),
      supabase
        .from('contractors')
        .select('*')
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .order('name', { ascending: true })
        .limit(limit * 2),
    ]);

    if (siteError) {
      throw siteError;
    }
    if (globalError) {
      throw globalError;
    }

    const inductedIds = await fetchContractorIdsWithSiteInductionRecord(siteId);
    const siteAssignedIds = new Set((siteAssigned || []).map((contractor) => contractor.id));
    const inductedOnlyIds = inductedIds.filter((contractorId) => !siteAssignedIds.has(contractorId));

    const inductedMatches = [];
    for (let i = 0; i < inductedOnlyIds.length && inductedMatches.length < limit; i += IN_QUERY_BATCH_SIZE) {
      const batch = inductedOnlyIds.slice(i, i + IN_QUERY_BATCH_SIZE);
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .in('id', batch)
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .order('name', { ascending: true })
        .limit(limit - inductedMatches.length);

      if (error) {
        throw error;
      }

      inductedMatches.push(...(data || []));
    }

    const merged = mergeUniqueContractors(
      siteAssigned || [],
      inductedMatches,
      globalNameMatches || []
    );
    const withCompanies = await attachCompanyNames(merged);
    const transformed = withCompanies.map(transformContractor);
    const withInductions = await attachSiteInductionsToContractors(transformed);

  return withInductions
    .filter((contractor) => contractorMatchesKioskSignInSearch(contractor, siteId))
    .slice(0, limit);
};

// Kiosk search: site roster matches plus anyone inducted anywhere (other sites).
export const searchContractorsForKiosk = async (siteId, searchText, limit = 40) => {
  try {
    if (!siteId) {
      return [];
    }

    const runEdge = async () => {
      const rows = await contractorDataSearchForKiosk(siteId, searchText, limit);
      const transformed = mapEdgeRowsToApp(rows);
      const withInductions = await attachSiteInductionsToContractors(transformed);
      return withInductions
        .filter((contractor) => contractorMatchesKioskSignInSearch(contractor, siteId))
        .slice(0, limit);
    };

    return await withContractorDataFallback(
      runEdge,
      () => searchContractorsForKioskDirect(siteId, searchText, limit),
      { label: 'searchContractorsForKiosk' },
    );
  } catch (error) {
    console.error('Error searching contractors for kiosk:', error.message);
    throw error;
  }
};

const listContractorsForKioskDirect = async (siteId) => {
  const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, business_unit_id')
      .eq('id', siteId)
      .maybeSingle();

    if (siteError) {
      throw siteError;
    }

    const businessUnitId = site?.business_unit_id || null;

    const [bySiteAssignment, byBusinessUnit, companyIds] = await Promise.all([
      fetchAllPaginated((from, to) =>
        supabase
          .from('contractors')
          .select('*')
          .contains('site_ids', [siteId])
          .order('name', { ascending: true })
          .range(from, to)
      ),
      businessUnitId
        ? fetchAllPaginated((from, to) =>
            supabase
              .from('contractors')
              .select('*')
              .overlaps('business_unit_ids', [businessUnitId])
              .order('name', { ascending: true })
              .range(from, to)
          )
        : Promise.resolve([]),
      fetchCompanyIdsForKioskSite(siteId, businessUnitId),
    ]);

    const [byCompany, inductedContractorIds] = await Promise.all([
      fetchContractorsByCompanyIds(companyIds),
      fetchContractorIdsWithSiteInductionRecord(siteId),
    ]);

    const assignedIds = new Set(
      mergeUniqueContractors(bySiteAssignment, byBusinessUnit, byCompany).map((row) => row.id)
    );
    const inductedOnlyIds = inductedContractorIds.filter((contractorId) => !assignedIds.has(contractorId));
    const bySiteInductionRecord = await fetchContractorsByIds(inductedOnlyIds);

  const merged = mergeUniqueContractors(bySiteAssignment, byBusinessUnit, byCompany, bySiteInductionRecord);
  const withCompanies = await attachCompanyNames(merged);
  const transformed = withCompanies.map(transformContractor);
  return attachSiteInductionsToContractors(transformed);
};

// Kiosk sign-in: contractors assigned to the site, in the site's business unit,
// or belonging to a company linked to the site / business unit.
export const listContractorsForKiosk = async (siteId) => {
  try {
    if (!siteId) {
      return [];
    }

    return await withContractorDataFallback(
      async () => {
        const rows = await contractorDataListForKiosk(siteId);
        const transformed = mapEdgeRowsToApp(rows);
        return attachSiteInductionsToContractors(transformed);
      },
      () => listContractorsForKioskDirect(siteId),
      { label: 'listContractorsForKiosk' },
    );
  } catch (error) {
    console.error('Error fetching contractors for kiosk:', error.message);
    throw error;
  }
};

const fetchContractorIdsWithSiteInductionRecord = async (siteId) => {
  const inductionRows = await fetchAllPaginated((from, to) =>
    supabase
      .from('contractor_inductions')
      .select('contractor_id')
      .eq('site_id', siteId)
      .range(from, to)
  );

  return [...new Set((inductionRows || []).map((row) => row.contractor_id).filter(Boolean))];
};

const fetchContractorsByIds = async (contractorIds = []) => {
  const uniqueIds = [...new Set((contractorIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const rows = [];
  for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const batchRows = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('*')
        .in('id', batch)
        .order('name', { ascending: true })
        .range(from, to)
    );
    rows.push(...batchRows);
  }

  return rows;
};

const listContractorsBySiteDirect = async (siteId) => {
  const [bySiteAssignment, inductedContractorIds] = await Promise.all([
    fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('*')
        .contains('site_ids', [siteId])
        .order('name', { ascending: true })
        .range(from, to),
    ),
    fetchContractorIdsWithSiteInductionRecord(siteId),
  ]);

  const inductedOnlyIds = inductedContractorIds.filter(
    (contractorId) => !(bySiteAssignment || []).some((row) => row.id === contractorId),
  );
  const bySiteInductionRecord = await fetchContractorsByIds(inductedOnlyIds);
  const merged = mergeUniqueContractors(bySiteAssignment, bySiteInductionRecord);
  const withCompanies = await attachCompanyNames(merged);
  const transformed = withCompanies.map(transformContractor);
  return attachSiteInductionsToContractors(transformed);
};

// Contractors assigned to a site (site_ids) or with a per-site induction record.
export const listContractorsBySite = async (siteId) => {
  try {
    if (!siteId) {
      return [];
    }

    return await withContractorDataFallback(
      async () => {
        const rows = await contractorDataListBySite(siteId);
        const transformed = mapEdgeRowsToApp(rows);
        return attachSiteInductionsToContractors(transformed);
      },
      () => listContractorsBySiteDirect(siteId),
      { label: 'listContractorsBySite' },
    );
  } catch (error) {
    console.error('Error fetching contractors for site:', error.message);
    throw error;
  }
};

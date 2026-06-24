import { supabase } from '../supabaseClient';

// PostgREST returns at most 1000 rows per request unless paginated with .range()
const PAGE_SIZE = 1000;
const IN_QUERY_BATCH_SIZE = 200;

const fetchAllPaginated = async (buildQuery) => {
  const allRows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    if (!data?.length) break;

    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
};

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

// Create a new contractor
export const createContractor = async (contractorData) => {
  try {
    // Prepare data: map services to service_ids if needed
    const dbData = {
      ...contractorData,
      service_ids: contractorData.service_ids || contractorData.serviceIds || contractorData.services || [],
    };
    
    const { data, error } = await supabase
      .from('contractors')
      .insert([dbData])
      .select();

    if (error) throw error;
    
    const contractor = data[0];
    if (contractor) {
      // Fetch company name if contractor has company_id
      if (contractor.company_id) {
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
          console.warn(`Could not fetch company for contractor:`, err.message);
        }
      }
    }
    
    return contractor ? transformContractor(contractor) : null;
  } catch (error) {
    console.error('Error creating contractor:', error.message);
    throw error;
  }
};

// Get all contractors with company details
export const listContractors = async () => {
  try {
    // Fetch contractors without join to avoid relationship ambiguity
    const data = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select()
        .order('name', { ascending: true })
        .range(from, to)
    );

    console.log('✅ Raw contractors data from Supabase:', data.length, 'contractors');
    console.log('📋 First contractor sample:', data[0]);

    const contractorsWithCompanies = await attachCompanyNames(data);
    const transformed = contractorsWithCompanies.map(transformContractor);
    console.log('✅ Transformed contractors:', transformed.length);

    return transformed;
  } catch (error) {
    console.error('❌ Error fetching contractors:', error.message);
    console.error('💾 Full error object:', error);
    throw error;
  }
};

// Get a single contractor
export const getContractor = async (contractorId) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select()
      .eq('id', contractorId)
      .single();

    if (error) throw error;
    
    // Fetch company name if contractor has company_id
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
        console.warn(`Could not fetch company for contractor:`, err.message);
      }
    }
    
    return data ? transformContractor(data) : null;
  } catch (error) {
    console.error('Error fetching contractor:', error.message);
    throw error;
  }
};

// Update a contractor
export const updateContractor = async (contractorId, updates) => {
  try {
    // Map camelCase keys to snake_case for database
    const dbUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      // Map camelCase to snake_case
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
        // Pass through as-is for snake_case keys
        dbUpdates[key] = value;
      }
    }
    
    const { data, error } = await supabase
      .from('contractors')
      .update(dbUpdates)
      .eq('id', contractorId)
      .select();

    if (error) throw error;
    
    const contractor = data[0];
    if (contractor) {
      // Fetch company name if contractor has company_id
      if (contractor.company_id) {
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
          console.warn(`Could not fetch company for contractor:`, err.message);
        }
      }
    }
    
    return contractor ? transformContractor(contractor) : null;
  } catch (error) {
    console.error('Error updating contractor:', error.message);
    throw error;
  }
};

// Delete a contractor
export const deleteContractor = async (contractorId) => {
  try {
    const { error } = await supabase
      .from('contractors')
      .delete()
      .eq('id', contractorId);

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
    const data = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('*, companies(name)')
        .eq('company_id', companyId)
        .order('name', { ascending: true })
        .range(from, to)
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
    const today = new Date().toISOString().split('T')[0];
    const data = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('*, companies(name)')
        .lt('induction_expiry', today)
        .order('induction_expiry', { ascending: false })
        .range(from, to)
    );

    return data.map(transformContractor);
  } catch (error) {
    console.error('Error fetching contractors with expired inductions:', error.message);
    throw error;
  }
};

// Get contractors for a specific site
export const listContractorsBySite = async (siteId) => {
  try {
    console.log('🔍 Loading contractors for site:', siteId);
    const contractors = await listContractors();
    console.log('✅ Contractors loaded:', contractors.length);
    return contractors;
  } catch (error) {
    console.error('Error fetching contractors for site:', error.message);
    throw error;
  }
};

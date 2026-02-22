import { supabase } from '../supabaseClient';

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
    services: dbContractor.services || [],
    siteIds: dbContractor.site_ids || [],
    site_ids: dbContractor.site_ids || [],
    createdAt: dbContractor.created_at,
    created_at: dbContractor.created_at,
  };
};

// Create a new contractor
export const createContractor = async (contractorData) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .insert([contractorData])
      .select();

    if (error) throw error;
    return data[0] ? transformContractor(data[0]) : null;
  } catch (error) {
    console.error('Error creating contractor:', error.message);
    throw error;
  }
};

// Get all contractors with company details
export const listContractors = async () => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select()
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Supabase error loading contractors:', error.code, error.message);
      throw error;
    }
    
    console.log('✅ Raw contractors data from Supabase:', data?.length || 0, 'contractors');
    console.log('📋 First contractor sample:', data?.[0]);
    
    const transformed = (data || []).map(transformContractor);
    console.log('✅ Transformed contractors:', transformed.length, transformed);
    
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
    return data ? transformContractor(data) : null;
  } catch (error) {
    console.error('Error fetching contractor:', error.message);
    throw error;
  }
};

// Update a contractor
export const updateContractor = async (contractorId, updates) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .update(updates)
      .eq('id', contractorId)
      .select();

    if (error) throw error;
    return data[0] ? transformContractor(data[0]) : null;
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

// Get contractors by company
export const listContractorsByCompany = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*, companies(name)')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformContractor);
  } catch (error) {
    console.error('Error fetching contractors by company:', error.message);
    throw error;
  }
};

// Get contractors with expired inductions
export const listContractorsWithExpiredInductions = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('contractors')
      .select('*, companies(name)')
      .lt('induction_expiry', today)
      .order('induction_expiry', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformContractor);
  } catch (error) {
    console.error('Error fetching contractors with expired inductions:', error.message);
    throw error;
  }
};

// Get contractors for a specific site
export const listContractorsBySite = async (siteId) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*, companies(name)')
      .contains('site_ids', [siteId])
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformContractor);
  } catch (error) {
    console.error('Error fetching contractors for site:', error.message);
    throw error;
  }
};

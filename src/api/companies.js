import { supabase } from '../supabaseClient';

// Helper function to transform Supabase data to app format
const transformCompany = (dbCompany) => {
  return {
    id: dbCompany.id,
    name: dbCompany.name,
    email: dbCompany.email,
    phone: dbCompany.phone,
    address: dbCompany.address,
    website: dbCompany.website,
    manuallyCreated: dbCompany.manually_created || false,
    manually_created: dbCompany.manually_created || false,
    createdBy_contractor_id: dbCompany.created_by_contractor_id || null,
    created_by_contractor_id: dbCompany.created_by_contractor_id || null,
    createdAt: dbCompany.created_at,
    created_at: dbCompany.created_at,
  };
};

// Create a new company
export const createCompany = async (companyData) => {
  try {
    // Prepare the data with snake_case field names for database
    const dbData = {
      name: companyData.name,
      email: companyData.email || null,
      phone: companyData.phone || null,
      address: companyData.address || null,
      website: companyData.website || null,
      manually_created: companyData.manually_created || companyData.manuallyCreated || false,
      created_by_contractor_id: companyData.created_by_contractor_id || companyData.createdByContractorId || null,
    };

    const { data, error } = await supabase
      .from('companies')
      .insert([dbData])
      .select();

    if (error) throw error;
    return data[0] ? transformCompany(data[0]) : null;
  } catch (error) {
    console.error('Error creating company:', error.message);
    throw error;
  }
};

// Get all companies
export const listCompanies = async () => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformCompany);
  } catch (error) {
    console.error('Error fetching companies:', error.message);
    throw error;
  }
};

// Get a single company
export const getCompany = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data ? transformCompany(data) : null;
  } catch (error) {
    console.error('Error fetching company:', error.message);
    throw error;
  }
};

// Update a company
export const updateCompany = async (companyId, updates) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select();

    if (error) throw error;
    return data[0] ? transformCompany(data[0]) : null;
  } catch (error) {
    console.error('Error updating company:', error.message);
    throw error;
  }
};

// Delete a company
export const deleteCompany = async (companyId) => {
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting company:', error.message);
    throw error;
  }
};

// Get a company by name (case-insensitive)
export const getCompanyByName = async (companyName) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', companyName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No results found
        return null;
      }
      throw error;
    }
    return data ? transformCompany(data) : null;
  } catch (error) {
    console.error('Error fetching company by name:', error.message);
    throw error;
  }
};

// Upsert a company - if exists by name, return it; if not, create it
export const upsertCompany = async (companyData) => {
  try {
    // Check if company with this name already exists
    const existing = await getCompanyByName(companyData.name);
    if (existing) {
      console.log('📦 Company already exists:', existing.name);
      return existing;
    }

    // Company doesn't exist, create it with tracking fields
    console.log('✨ Creating new company:', companyData.name);
    const created = await createCompany({
      name: companyData.name,
      email: companyData.email || null,
      phone: companyData.phone || null,
      address: companyData.address || null,
      website: companyData.website || null,
      manuallyCreated: companyData.manuallyCreated || companyData.manually_created || false,
      createdByContractorId: companyData.createdByContractorId || companyData.created_by_contractor_id || null,
    });
    return created;
  } catch (error) {
    console.error('Error upserting company:', error.message);
    throw error;
  }
};

import { supabase } from '../supabaseClient';

// Helper function to transform Supabase data to app format
const transformCompany = (dbCompany) => {
  return {
    id: dbCompany.id,
    name: dbCompany.name,
    email: dbCompany.email,
    businessUnitIds: dbCompany.business_unit_ids || [],
    business_unit_ids: dbCompany.business_unit_ids || [],
    contactName: dbCompany.contact_name || '',
    contact_name: dbCompany.contact_name || '',
    contactSurname: dbCompany.contact_surname || '',
    contact_surname: dbCompany.contact_surname || '',
    contactEmail: dbCompany.contact_email || '',
    contact_email: dbCompany.contact_email || '',
    contactPhone: dbCompany.contact_phone || '',
    contact_phone: dbCompany.contact_phone || '',
    publicLiabilityExpiry: dbCompany.public_liability_expiry || '',
    public_liability_expiry: dbCompany.public_liability_expiry || '',
    motorVehicleInsuranceExpiry: dbCompany.motor_vehicle_insurance_expiry || '',
    motor_vehicle_insurance_expiry: dbCompany.motor_vehicle_insurance_expiry || '',
    reviewDate: dbCompany.review_date || '',
    review_date: dbCompany.review_date || '',
    accreditedDate: dbCompany.accredited_date || '',
    accredited_date: dbCompany.accredited_date || '',
    manuallyCreated: dbCompany.manually_created || false,
    manually_created: dbCompany.manually_created || false,
    createdAt: dbCompany.created_at,
    created_at: dbCompany.created_at,
    updatedAt: dbCompany.updated_at,
    updated_at: dbCompany.updated_at,
  };
};

// Create a new company
export const createCompany = async (companyData) => {
  try {
    // Prepare the data with only fields that exist in the companies table
    const dbData = {
      name: companyData.name,
      email: companyData.email || null,
      manually_created: companyData.manually_created || companyData.manuallyCreated || false,
      contact_name: companyData.contact_name || companyData.contactName || null,
      contact_surname: companyData.contact_surname || companyData.contactSurname || null,
      contact_email: companyData.contact_email || companyData.contactEmail || null,
      contact_phone: companyData.contact_phone || companyData.contactPhone || null,
      public_liability_expiry: companyData.public_liability_expiry || companyData.publicLiabilityExpiry || null,
      motor_vehicle_insurance_expiry: companyData.motor_vehicle_insurance_expiry || companyData.motorVehicleInsuranceExpiry || null,
      review_date: companyData.review_date || companyData.reviewDate || null,
      accredited_date: companyData.accredited_date || companyData.accreditedDate || null,
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
      .select('id, name, email, created_at, updated_at')
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
      .select('id, name, email, created_at, updated_at')
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
    // Only allow updating fields that exist in the companies table
    const allowedFields = ['name', 'email', 'business_unit_ids', 'contact_name', 'contact_surname', 'contact_email', 'contact_phone', 'public_liability_expiry', 'motor_vehicle_insurance_expiry', 'review_date', 'accredited_date'];
    const validUpdates = {};
    Object.keys(updates).forEach(key => {
      // Support both camelCase and snake_case
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeCaseKey)) {
        validUpdates[snakeCaseKey] = updates[key];
      } else if (allowedFields.includes(key)) {
        validUpdates[key] = updates[key];
      }
    });

    const { data, error } = await supabase
      .from('companies')
      .update(validUpdates)
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
      .select('id, name, email, created_at, updated_at')
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

    // Company doesn't exist, create it and mark as manually created
    console.log('✨ Creating new company:', companyData.name);
    const created = await createCompany({
      name: companyData.name,
      email: companyData.email || null,
      manually_created: true,
    });
    return created;
  } catch (error) {
    console.error('Error upserting company:', error.message);
    throw error;
  }
};

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
    contactManager: dbCompany.contact_manager || '',
    contact_manager: dbCompany.contact_manager || '',
    publicLiabilityExpiry: dbCompany.public_liability_expiry || '',
    public_liability_expiry: dbCompany.public_liability_expiry || '',
    motorVehicleInsuranceExpiry: dbCompany.motor_vehicle_insurance_expiry || '',
    motor_vehicle_insurance_expiry: dbCompany.motor_vehicle_insurance_expiry || '',
    reviewDate: dbCompany.review_date || '',
    review_date: dbCompany.review_date || '',
    accreditedDate: dbCompany.accredited_date || '',
    accredited_date: dbCompany.accredited_date || '',
    companyActive: dbCompany.company_active !== false,
    company_active: dbCompany.company_active !== false,
    preQualificationApproved: dbCompany.pre_qualification_approved || false,
    pre_qualification_approved: dbCompany.pre_qualification_approved || false,
    abnNzbn: dbCompany.abn_nzbn || '',
    abn_nzbn: dbCompany.abn_nzbn || '',
    address1: dbCompany.address_1 || '',
    address_1: dbCompany.address_1 || '',
    addressCity: dbCompany.address_city || '',
    address_city: dbCompany.address_city || '',
    addressPostcode: dbCompany.address_postcode || '',
    address_postcode: dbCompany.address_postcode || '',
    manuallyCreated: dbCompany.manually_created || false,
    manually_created: dbCompany.manually_created || false,
    accreditationInvitationSentAt: dbCompany.accreditation_invitation_sent_at || null,
    accreditation_invitation_sent_at: dbCompany.accreditation_invitation_sent_at || null,
    accreditationDeadline: dbCompany.accreditation_deadline || null,
    accreditation_deadline: dbCompany.accreditation_deadline || null,
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
      contact_manager: companyData.contact_manager || companyData.contactManager || null,
      public_liability_expiry: companyData.public_liability_expiry || companyData.publicLiabilityExpiry || null,
      motor_vehicle_insurance_expiry: companyData.motor_vehicle_insurance_expiry || companyData.motorVehicleInsuranceExpiry || null,
      review_date: companyData.review_date || companyData.reviewDate || null,
      accredited_date: companyData.accredited_date || companyData.accreditedDate || null,
      company_active: companyData.company_active !== undefined ? companyData.company_active : (companyData.companyActive !== undefined ? companyData.companyActive : true),
      pre_qualification_approved: companyData.pre_qualification_approved || companyData.preQualificationApproved || false,
      abn_nzbn: companyData.abn_nzbn || companyData.abnNzbn || null,
      address_1: companyData.address_1 || companyData.address1 || null,
      address_city: companyData.address_city || companyData.addressCity || null,
      address_postcode: companyData.address_postcode || companyData.addressPostcode || null,
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
      .select('id, name, email, contact_name, contact_surname, contact_email, contact_phone, contact_manager, business_unit_ids, public_liability_expiry, motor_vehicle_insurance_expiry, review_date, accredited_date, manually_created, company_active, pre_qualification_approved, abn_nzbn, address_1, address_city, address_postcode, created_at, updated_at, accreditation_invitation_sent_at, accreditation_deadline')
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
      .select('id, name, email, contact_name, contact_surname, contact_email, contact_phone, contact_manager, business_unit_ids, public_liability_expiry, motor_vehicle_insurance_expiry, review_date, accredited_date, manually_created, company_active, pre_qualification_approved, abn_nzbn, address_1, address_city, address_postcode, created_at, updated_at, accreditation_invitation_sent_at, accreditation_deadline')
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
    const allowedFields = ['name', 'email', 'business_unit_ids', 'contact_name', 'contact_surname', 'contact_email', 'contact_phone', 'contact_manager', 'public_liability_expiry', 'motor_vehicle_insurance_expiry', 'review_date', 'accredited_date', 'company_active', 'pre_qualification_approved', 'abn_nzbn', 'address_1', 'address_city', 'address_postcode'];
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

// Get contractors linked to a company
export const getContractorsByCompany = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, name, email')
      .eq('company_id', companyId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching contractors for company:', error.message);
    throw error;
  }
};

// Delete a company with options for handling linked contractors
export const deleteCompany = async (companyId, options = {}) => {
  const { deleteContractors = false } = options;
  
  try {
    // First, get all contractors for this company
    const { data: companyContractors, error: fetchError } = await supabase
      .from('contractors')
      .select('id')
      .eq('company_id', companyId);
    
    if (fetchError) throw fetchError;
    
    const contractorIds = (companyContractors || []).map(c => c.id);
    
    // If deleteContractors is true, handle cascade deletion
    if (deleteContractors && contractorIds.length > 0) {
      // Delete permits linked to these contractors
      const { error: permitsError } = await supabase
        .from('permits')
        .delete()
        .in('contractor_id', contractorIds);
      
      if (permitsError) throw permitsError;
      
      // Delete contractor inductions (should cascade automatically, but be explicit)
      const { error: inductionsError } = await supabase
        .from('contractor_inductions')
        .delete()
        .in('contractor_id', contractorIds);
      
      if (inductionsError) throw inductionsError;
      
      // Finally delete the contractors
      const { error: contractorError } = await supabase
        .from('contractors')
        .delete()
        .eq('company_id', companyId);
      
      if (contractorError) throw contractorError;
    } else if (contractorIds.length > 0) {
      // Otherwise, orphan contractors and set their permits' contractor_id to null
      const { error: permitsError } = await supabase
        .from('permits')
        .update({ contractor_id: null })
        .in('contractor_id', contractorIds);
      
      if (permitsError) throw permitsError;
      
      // Orphan the contractors
      const { error: updateError } = await supabase
        .from('contractors')
        .update({ company_id: null })
        .eq('company_id', companyId);
      
      if (updateError) throw updateError;
    }

    // Now delete the company
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
      .select('id, name, email, contact_name, contact_surname, contact_email, contact_phone, business_unit_ids, public_liability_expiry, motor_vehicle_insurance_expiry, review_date, accredited_date, manually_created, created_at, updated_at, accreditation_invitation_sent_at, accreditation_deadline')
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

// Get company accreditation data
// NOTE: Use getCompanyAccreditation from accreditations.js instead
// This is kept for backwards compatibility but delegates to accreditations
export const getCompanyAccreditation = async (companyId) => {
  try {
    const { getCompanyAccreditation: getAccred } = await import('./accreditations.js');
    return await getAccred(companyId);
  } catch (error) {
    console.error('Error fetching company accreditation:', error.message);
    return null;
  }
};

// Approve company accreditation
export const approveCompanyAccreditation = async (companyId, approvedBy) => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('companies')
      .update({
        accreditation_status: 'approved',
        accreditation_approved_by: approvedBy,
        accreditation_approved_at: now
      })
      .eq('id', companyId)
      .select();

    if (error) throw error;

    const company = data[0];
    return {
      id: company.id,
      name: company.name,
      status: company.accreditation_status,
      approvedBy: company.accreditation_approved_by,
      approvedAt: company.accreditation_approved_at
    };
  } catch (error) {
    console.error('Error approving company accreditation:', error.message);
    throw error;
  }
};

// Reject company accreditation
export const rejectCompanyAccreditation = async (companyId, reason) => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('companies')
      .update({
        accreditation_status: 'rejected',
        accreditation_rejection_reason: reason,
        accreditation_approved_at: now
      })
      .eq('id', companyId)
      .select();

    if (error) throw error;

    const company = data[0];
    return {
      id: company.id,
      name: company.name,
      status: company.accreditation_status,
      rejectionReason: company.accreditation_rejection_reason
    };
  } catch (error) {
    console.error('Error rejecting company accreditation:', error.message);
    throw error;
  }
};

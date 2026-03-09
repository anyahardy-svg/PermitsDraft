import { supabase } from '../supabaseClient';

/**
 * Update company accreditation - Sections 2 & 3
 * @param {UUID} companyId - Company UUID
 * @param {Object} accreditationData - Updated accreditation info
 * @returns {Object} Updated company data
 */
export const updateCompanyAccreditation = async (companyId, accreditationData) => {
  try {
    const updates = {
      ...accreditationData,
      accreditation_last_updated: new Date().toISOString(),
    };

    console.log('📤 Update request to Supabase:', { companyId, updates });

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select();

    console.log('📥 Supabase response:', { data, error });

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error updating accreditation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get company accreditation details
 * @param {UUID} companyId
 * @returns {Object} Company accreditation data
 */
export const getCompanyAccreditation = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        email,
        contact_name,
        contact_surname,
        contact_email,
        contact_phone,
        approved_services,
        fletcher_business_units,
        aep_accredited,
        aep_certificate_url,
        aep_certificate_expiry,
        iso_45001_certified,
        iso_45001_certificate_url,
        iso_45001_certificate_expiry,
        totika_prequalified,
        totika_certificate_url,
        totika_certificate_expiry,
        she_prequal_qualified,
        she_prequal_certificate_url,
        she_prequal_certificate_expiry,
        impac_prequalified,
        impac_certificate_url,
        impac_certificate_expiry,
        sitewise_prequalified,
        sitewise_certificate_url,
        sitewise_certificate_expiry,
        rapid_prequalified,
        rapid_certificate_url,
        rapid_certificate_expiry,
        iso_9001_certified,
        iso_9001_certificate_url,
        iso_9001_certificate_expiry,
        iso_14001_certified,
        iso_14001_certificate_url,
        iso_14001_certificate_expiry,
        accreditation_status,
        accreditation_last_updated,
        accreditation_expiry_date
      `)
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching accreditation:', error.message);
    throw error;
  }
};

/**
 * Get all companies for accreditation dashboard (admin only)
 * @returns {Array} All companies with accreditation status
 */
export const getAllCompaniesAccreditation = async () => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        nzbn,
        approved_services,
        aep_accredited,
        aep_certificate_expiry,
        iso_45001_certified,
        iso_45001_certificate_expiry,
        accreditation_last_updated,
        accreditation_expiry_date
      `)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all accreditations:', error.message);
    throw error;
  }
};

/**
 * Upload accreditation certificate to Supabase Storage
 * @param {UUID} companyId
 * @param {string} certificationType - e.g., 'iso_45001', 'aep', 'totika'
 * @param {File} file - File to upload
 * @returns {string} Public URL of uploaded file
 */
export const uploadAccreditationCertificate = async (companyId, certificationType, file) => {
  try {
    if (!file) throw new Error('No file provided');

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${certificationType}/${timestamp}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('accreditations')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('accreditations')
      .getPublicUrl(fileName);

    return {
      success: true,
      url: publicUrl.publicUrl
    };
  } catch (error) {
    console.error('Error uploading certificate:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check expiry status of accreditations
 * Returns 'valid', 'expiring_soon' (< 90 days), or 'expired'
 */
export const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry < 90) return 'expiring_soon';
  return 'valid';
};

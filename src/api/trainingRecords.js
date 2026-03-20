/**
 * Training Records API
 * Handles uploading, managing, and tracking individual contractor training records
 */

import { supabase } from '../supabaseClient';

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Validate file type
 * @param {File} file - File to validate
 * @returns {boolean} Valid or not
 */
function isValidFileType(file) {
  // Check MIME type
  if (ALLOWED_FILE_TYPES.includes(file.type)) {
    return true;
  }

  // Check file extension
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Upload a training record file
 * @param {UUID} contractorId - Contractor ID
 * @param {string} trainingType - Type of training (free text)
 * @param {File} file - File to upload
 * @param {Date} expiryDate - Optional expiry date
 * @param {string} notes - Optional notes
 * @returns {Object} Upload result
 */
export async function uploadTrainingRecord(contractorId, trainingType, file, expiryDate = null, notes = '') {
  try {
    console.log('📤 Uploading training record:', { contractorId, trainingType, fileName: file.name });

    // Validate file type
    if (!isValidFileType(file)) {
      throw new Error('Only PDF and image files (JPG, PNG, GIF) are allowed');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${contractorId}/${Date.now()}.${fileExt}`;

    // Upload file to Supabase Storage
    console.log('📁 Uploading to storage:', fileName);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('training-records')
      .upload(fileName, file);

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ File uploaded to storage');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('training-records')
      .getPublicUrl(fileName);

    console.log('📥 Creating training record in DB');

    // Create record in database
    const { data: record, error: dbError } = await supabase
      .from('training_records')
      .insert([{
        contractor_id: contractorId,
        training_type: trainingType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type || 'application/pdf',
        expiry_date: expiryDate,
        notes: notes,
        status: 'pending'
      }])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }

    console.log('✅ Training record created:', record.id);
    return { success: true, data: record, message: `Training record uploaded for ${trainingType}` };
  } catch (error) {
    console.error('❌ Upload training record error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get training records for a contractor
 * @param {UUID} contractorId - Contractor ID
 * @returns {Array} Training records
 */
export async function getTrainingRecords(contractorId) {
  try {
    console.log('📋 Fetching training records for contractor:', contractorId);

    const { data, error } = await supabase
      .from('training_records')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ Fetched ${data.length} training records`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Get training records error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all training records for a company (across all contractors)
 * @param {UUID} companyId - Company ID
 * @returns {Object} Training records with contractor names
 */
export async function getTrainingRecordsByCompany(companyId) {
  try {
    console.log('📋 Fetching training records for company:', companyId);

    const { data, error } = await supabase
      .from('training_records')
      .select(`
        *,
        contractor:contractors(id, name, company_id)
      `)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    // Filter by company ID client-side (nested filter not supported in Supabase)
    const filteredData = data.filter(record => record.contractor?.company_id === companyId);

    console.log(`✅ Fetched ${filteredData.length} training records for company`);
    return { success: true, data: filteredData };
  } catch (error) {
    console.error('❌ Get company training records error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a training record
 * @param {UUID} recordId - Training record ID
 * @param {string} fileUrl - File URL for deletion from storage
 * @returns {Object} Delete result
 */
export async function deleteTrainingRecord(recordId, fileUrl) {
  try {
    console.log('🗑️ Deleting training record:', recordId);

    // Extract file path from URL and delete from storage
    if (fileUrl) {
      try {
        const filePath = fileUrl.split('/training-records/')[1];
        if (filePath) {
          console.log('🗑️ Deleting file from storage:', filePath);
          await supabase.storage
            .from('training-records')
            .remove([filePath]);
        }
      } catch (storageError) {
        console.warn('⚠️ Warning deleting file from storage:', storageError);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('training_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;

    console.log('✅ Training record deleted');
    return { success: true, message: 'Training record deleted' };
  } catch (error) {
    console.error('❌ Delete training record error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve a training record
 * @param {UUID} recordId - Training record ID
 * @param {string} approvedByName - Name of person approving
 * @param {string} businessUnitName - Business unit name
 * @returns {Object} Update result
 */
export async function approveTrainingRecord(recordId, approvedByName, businessUnitName) {
  try {
    console.log('✅ Approving training record:', recordId);

    const { data, error } = await supabase
      .from('training_records')
      .update({
        status: 'approved',
        approved_by_name: approvedByName,
        approved_by_business_unit: businessUnitName,
        approved_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Training record approved');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Approve training record error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate and get the overall training records status for a company
 * Status is calculated based on individual training records:
 * - 'none': No training records exist
 * - 'added': Records uploaded but not yet all approved
 * - 'approved': All training records are approved
 * - 'needs_review': New records added after previous approval
 * @param {UUID} companyId - Company ID
 * @returns {Object} Status and related metadata
 */
export async function getCompanyTrainingRecordsStatus(companyId) {
  try {
    console.log('📊 Getting training records status for company:', companyId);

    // Get all training records for the company
    const recordsResult = await getTrainingRecordsByCompany(companyId);
    if (!recordsResult.success) {
      throw new Error(recordsResult.error);
    }

    // Get company data to check current status timestamps
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('training_records_status, training_records_approved_at, training_records_submitted_at')
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;

    const records = recordsResult.data || [];

    // If no records, status is 'none'
    if (records.length === 0) {
      return {
        success: true,
        status: 'none',
        recordCount: 0,
        approvedCount: 0,
        pendingCount: 0
      };
    }

    // Count approved and pending records
    const approvedCount = records.filter(r => r.status === 'approved').length;
    const pendingCount = records.filter(r => r.status === 'pending').length;

    let status = 'added'; // Default: has records but not all approved

    // If all records are approved
    if (pendingCount === 0 && approvedCount > 0) {
      status = 'approved';
    }
    // If previously approved but new records added (needs review again)
    else if (company?.training_records_approved_at && company?.training_records_last_modified_at) {
      const approvedDate = new Date(company.training_records_approved_at);
      const modifiedDate = new Date(company.training_records_last_modified_at);
      if (modifiedDate > approvedDate) {
        status = 'needs_review';
      }
    }

    console.log(`✅ Training records status: ${status} (${approvedCount}/${records.length} approved)`);
    return {
      success: true,
      status,
      recordCount: records.length,
      approvedCount,
      pendingCount,
      submittedAt: company?.training_records_submitted_at,
      approvedAt: company?.training_records_approved_at
    };
  } catch (error) {
    console.error('❌ Get training records status error:', error);
    return { success: false, error: error.message, status: 'none' };
  }
}

/**
 * Approve all pending training records for a company at once
 * Updates both individual records and company-level status
 * @param {UUID} companyId - Company ID
 * @param {string} approvedByName - Name of person approving
 * @param {string} businessUnitName - Business unit name (optional)
 * @returns {Object} Approval result
 */
export async function approveAllCompanyTrainingRecords(companyId, approvedByName, businessUnitName = '') {
  try {
    console.log('✅ Approving all training records for company:', companyId);

    // Get all pending training records for the company
    const recordsResult = await getTrainingRecordsByCompany(companyId);
    if (!recordsResult.success) {
      throw new Error(recordsResult.error);
    }

    const records = recordsResult.data || [];
    const pendingRecords = records.filter(r => r.status === 'pending');

    if (pendingRecords.length === 0) {
      console.log('ℹ️ No pending records to approve');
      return { success: true, message: 'No pending records to approve', approvedCount: 0 };
    }

    // Approve each pending record
    const approvalPromises = pendingRecords.map(record =>
      supabase
        .from('training_records')
        .update({
          status: 'approved',
          approved_by_name: approvedByName,
          approved_by_business_unit: businessUnitName,
          approved_at: new Date().toISOString()
        })
        .eq('id', record.id)
    );

    const results = await Promise.all(approvalPromises);

    // Check if all updates were successful
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error(`Failed to approve ${errors.length} records`);
    }

    // Update company-level status
    const { error: companyError } = await supabase
      .from('companies')
      .update({
        training_records_status: 'approved',
        training_records_approved_at: new Date().toISOString(),
        training_records_approved_by: approvedByName
      })
      .eq('id', companyId);

    if (companyError) throw companyError;

    console.log(`✅ Approved ${pendingRecords.length} training records for company`);
    return {
      success: true,
      message: `Approved ${pendingRecords.length} training records`,
      approvedCount: pendingRecords.length
    };
  } catch (error) {
    console.error('❌ Approve all training records error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update the company-level training records status
 * Called whenever records are added or deleted
 * Recalculates status based on current records
 * @param {UUID} companyId - Company ID
 * @returns {Object} Update result
 */
export async function updateCompanyTrainingRecordsStatus(companyId) {
  try {
    console.log('🔄 Updating training records status for company:', companyId);

    // Get current status
    const statusResult = await getCompanyTrainingRecordsStatus(companyId);
    if (!statusResult.success) {
      throw new Error(statusResult.error);
    }

    const { status, recordCount, pendingCount } = statusResult;

    // Set submitted timestamp if records just added (none → added)
    let updateData = { training_records_status: status };

    if (recordCount > 0 && status === 'added') {
      const { data: company } = await supabase
        .from('companies')
        .select('training_records_submitted_at')
        .eq('id', companyId)
        .single();

      if (!company?.training_records_submitted_at) {
        updateData.training_records_submitted_at = new Date().toISOString();
      }
    }

    // Mark when records were last modified (if not approved)
    if (pendingCount > 0) {
      updateData.training_records_last_modified_at = new Date().toISOString();
    }

    // Update company record
    const { error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId);

    if (error) throw error;

    console.log(`✅ Training records status updated: ${status}`);
    return { success: true, status };
  } catch (error) {
    console.error('❌ Update training records status error:', error);
    return { success: false, error: error.message };
  }
}

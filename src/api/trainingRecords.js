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
 * Update company training records counters
 * Called whenever a record is added, deleted, or approved
 * @param {UUID} companyId - Company ID
 * @returns {Object} Update result
 */
async function updateCompanyTrainingRecordsCounters(companyId) {
  try {
    // Get all training records for the company
    const recordsResult = await getTrainingRecordsByCompany(companyId);
    const records = recordsResult.data || [];

    const total = records.length;
    const approved = records.filter(r => r.status === 'approved').length;

    // Update counters in company table
    const { error } = await supabase
      .from('companies')
      .update({
        training_records_total: total,
        training_records_approved: approved
      })
      .eq('id', companyId);

    if (error) throw error;

    console.log(`✅ Updated counters for company: total=${total}, approved=${approved}`);
    return { success: true, total, approved };
  } catch (error) {
    console.error('❌ Error updating counters:', error);
    return { success: false, error: error.message };
  }
}

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
    
    // Update company counters
    const { data: contractor } = await supabase
      .from('contractors')
      .select('company_id')
      .eq('id', contractorId)
      .single();
    
    if (contractor?.company_id) {
      await updateCompanyTrainingRecordsCounters(contractor.company_id);
    }
    
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

    // Get the record to find contractor ID before deleting
    const { data: record } = await supabase
      .from('training_records')
      .select('contractor_id')
      .eq('id', recordId)
      .single();

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
    
    // Update company counters
    if (record?.contractor_id) {
      const { data: contractor } = await supabase
        .from('contractors')
        .select('company_id')
        .eq('id', record.contractor_id)
        .single();
      
      if (contractor?.company_id) {
        await updateCompanyTrainingRecordsCounters(contractor.company_id);
      }
    }
    
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

    // Get the record to find contractor ID
    const { data: recordData } = await supabase
      .from('training_records')
      .select('contractor_id')
      .eq('id', recordId)
      .single();

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
    
    // Update company counters
    if (recordData?.contractor_id) {
      const { data: contractor } = await supabase
        .from('contractors')
        .select('company_id')
        .eq('id', recordData.contractor_id)
        .single();
      
      if (contractor?.company_id) {
        await updateCompanyTrainingRecordsCounters(contractor.company_id);
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Approve training record error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the training records status for a company
 * Reads from counters in company table and calculates status
 * Much faster than fetching and filtering all records!
 * @param {UUID} companyId - Company ID
 * @returns {Object} Status and related metadata
 */
export async function getCompanyTrainingRecordsStatus(companyId) {
  try {
    console.log('📊 Getting training records status for company:', companyId);

    // Get company data with counter fields
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('training_records_total, training_records_approved')
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;

    const total = company?.training_records_total || 0;
    const approved = company?.training_records_approved || 0;

    // Calculate status from counters
    let status = 'none';
    if (total > 0) {
      if (approved === total) {
        status = 'approved';
      } else {
        status = 'added';
      }
    }

    console.log(`✅ Training records status: ${status} (${approved}/${total} approved)`);
    return {
      success: true,
      status,
      total,
      approved,
      pending: total - approved
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
 * Update an existing training record with new file and/or expiry date
 * Deletes old file and uploads new one
 * @param {UUID} recordId - Training record ID
 * @param {File} file - New file to upload (optional)
 * @param {Date} expiryDate - New expiry date (optional)
 * @returns {Object} Update result
 */
export async function updateTrainingRecord(recordId, file = null, expiryDate = null) {
  try {
    console.log('🔄 Updating training record:', recordId);

    // Get current record to get contractor ID and old file URL
    const { data: record, error: fetchError } = await supabase
      .from('training_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchError) throw fetchError;

    let updateData = {};
    let newFileUrl = record.file_url;
    let newFileName = record.file_name;
    let newFileSize = record.file_size;
    let newFileType = record.file_type;

    // If new file provided, upload it
    if (file) {
      console.log('📤 Uploading new file for training record');

      // Validate file type
      if (!isValidFileType(file)) {
        throw new Error('Only PDF and image files (JPG, PNG, GIF, WebP) are allowed');
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${record.contractor_id}/${Date.now()}.${fileExt}`;

      // Upload new file to storage
      console.log('📁 Uploading to storage:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training-records')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL for new file
      const { data: { publicUrl } } = supabase.storage
        .from('training-records')
        .getPublicUrl(fileName);

      // Delete old file from storage if exists
      if (record.file_url) {
        try {
          const oldFilePath = record.file_url.split('/training-records/')[1];
          if (oldFilePath) {
            console.log('🗑️ Deleting old file from storage:', oldFilePath);
            await supabase.storage
              .from('training-records')
              .remove([oldFilePath]);
          }
        } catch (storageError) {
          console.warn('⚠️ Warning deleting old file from storage:', storageError);
          // Continue even if old file deletion fails
        }
      }

      // Update file fields
      updateData.file_url = publicUrl;
      updateData.file_name = file.name;
      updateData.file_size = file.size;
      updateData.file_type = file.type || 'application/pdf';

      // Reset status to pending since new file uploaded
      updateData.status = 'pending';
      updateData.approved_at = null;
      updateData.approved_by_name = null;
      updateData.approved_by_business_unit = null;
    }

    // Update expiry date if provided
    if (expiryDate) {
      updateData.expiry_date = expiryDate;
    }

    // Update record in database
    console.log('💾 Updating training record in database');
    const { data: updatedRecord, error: updateError } = await supabase
      .from('training_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ Training record updated:', recordId);
    
    // Update company counters (status might have changed)
    if (record?.contractor_id) {
      const { data: contractor } = await supabase
        .from('contractors')
        .select('company_id')
        .eq('id', record.contractor_id)
        .single();
      
      if (contractor?.company_id) {
        await updateCompanyTrainingRecordsCounters(contractor.company_id);
      }
    }
    
    return { success: true, data: updatedRecord, message: 'Training record updated' };
  } catch (error) {
    console.error('❌ Update training record error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update the company-level training records status
 * Called whenever records are added or deleted
 * Calculates status based on actual training records, then saves to database
 * @param {UUID} companyId - Company ID
 * @returns {Object} Update result
 */
export async function updateCompanyTrainingRecordsStatus(companyId) {
  try {
    console.log('🔄 Updating training records status for company:', companyId);

    // Update counters (this recalculates from actual records)
    const counterResult = await updateCompanyTrainingRecordsCounters(companyId);
    if (!counterResult.success) {
      throw new Error(counterResult.error);
    }

    const { total, approved } = counterResult;

    // Calculate status from counters
    let status = 'none';
    if (total > 0) {
      status = approved === total ? 'approved' : 'added';
    }

    console.log(`✅ Training records status updated: ${status} (${approved}/${total})`);
    return { success: true, status, total, approved, pending: total - approved };
  } catch (error) {
    console.error('❌ Update training records status error:', error);
    return { success: false, error: error.message };
  }
}

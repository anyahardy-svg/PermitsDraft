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

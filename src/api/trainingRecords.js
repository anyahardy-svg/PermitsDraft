/**
 * Training Records API
 * Handles uploading, managing, and tracking individual contractor training records
 */

import { supabase } from '../supabaseClient';
import { safePromiseAll, handleError } from '../utils/errorHandler';
import { fetchAllPaginated, fetchAllBatchedByIds } from './pagination';
import {
  buildTrainingRecordStoragePath,
  extractTrainingRecordsStoragePath,
} from '../utils/storagePaths';
import { trainingRecordsFileReference } from './trainingRecordsStorage';
import {
  fetchCompanyRowViaEdge,
  fetchCompanyRowsByIdsViaEdge,
  preferCompanyEdgeForAdmin,
  trainingRecordsStatusFromRow,
} from './companyTrainingCounters';
import { updateCompany } from './companies';
import { contractorDataGet, contractorDataListByCompany } from './contractorData';
import {
  preferTrainingRecordsEdgeForAdmin,
  trainingRecordsDataApprove,
  trainingRecordsDataApproveAllPending,
  trainingRecordsDataDelete,
  trainingRecordsDataGet,
  trainingRecordsDataListByCompany,
  trainingRecordsDataListByContractor,
  trainingRecordsDataUpdate,
} from './trainingRecordsData';

async function resolveContractorCompanyId(contractorId) {
  if (!contractorId) {
    return null;
  }
  if (preferCompanyEdgeForAdmin()) {
    try {
      const contractor = await contractorDataGet(contractorId);
      return contractor?.company_id || null;
    } catch (edgeError) {
      console.warn('resolveContractorCompanyId edge failed:', edgeError?.message);
    }
  }
  const { data, error } = await supabase
    .from('contractors')
    .select('company_id')
    .eq('id', contractorId)
    .single();
  if (error) {
    throw error;
  }
  return data?.company_id || null;
}

async function loadContractorsForCompany(companyId) {
  if (preferCompanyEdgeForAdmin()) {
    try {
      return await contractorDataListByCompany(companyId);
    } catch (edgeError) {
      console.warn('loadContractorsForCompany edge failed, fallback:', edgeError?.message);
    }
  }
  return fetchAllPaginated((from, to) =>
    supabase
      .from('contractors')
      .select('id, name, email, company_id')
      .eq('company_id', companyId)
      .order('name', { ascending: true })
      .range(from, to),
  );
}

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

    const counterUpdates = {
      training_records_total: total,
      training_records_approved: approved,
    };

    if (preferCompanyEdgeForAdmin()) {
      await updateCompany(companyId, counterUpdates);
    } else {
      const { error } = await supabase.from('companies').update(counterUpdates).eq('id', companyId);
      if (error) throw error;
    }

    console.log(`✅ Updated counters for company: total=${total}, approved=${approved}`);
    return { success: true, total, approved };
  } catch (error) {
    console.error('❌ Error updating counters:', error);
    return { success: false, error: error.message };
  }
}

function formatDateForDb(date) {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().split('T')[0];
}

function isValidFileType(file) {
  if (!file?.name) {
    return false;
  }

  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    return true;
  }

  return Boolean(file.type && ALLOWED_FILE_TYPES.includes(file.type));
}

function normalizeFileType(file) {
  if (file?.type && ALLOWED_FILE_TYPES.includes(file.type)) {
    return file.type;
  }

  const ext = '.' + (file?.name?.split('.').pop() || '').toLowerCase();
  const mimeByExtension = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  return mimeByExtension[ext] || 'application/pdf';
}

function getErrorMessage(error, fallback = 'Upload failed') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error.message || error.error_description || error.details || fallback;
}

async function getContractorStorageContext(contractorId, companyId = null) {
  let contractor = null;
  if (preferCompanyEdgeForAdmin()) {
    try {
      contractor = await contractorDataGet(contractorId);
    } catch (edgeError) {
      console.warn('getContractorStorageContext contractor edge failed:', edgeError?.message);
    }
  }
  if (!contractor) {
    const { data, error: contractorError } = await supabase
      .from('contractors')
      .select('id, name, company_id')
      .eq('id', contractorId)
      .single();
    if (contractorError) {
      throw contractorError;
    }
    contractor = data;
  }

  let companyName = 'unknown_company';
  const resolvedCompanyId = companyId || contractor?.company_id;

  if (resolvedCompanyId) {
    if (preferCompanyEdgeForAdmin()) {
      try {
        const company = await fetchCompanyRowViaEdge(resolvedCompanyId);
        if (company?.name) {
          companyName = company.name;
        }
      } catch (edgeError) {
        console.warn('getContractorStorageContext company edge failed:', edgeError?.message);
      }
    } else {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', resolvedCompanyId)
        .single();

      if (!companyError && company?.name) {
        companyName = company.name;
      }
    }
  }

  return {
    contractorName: contractor?.name || 'unknown_contractor',
    companyName,
  };
}

/**
 * Upload a training record file
 * @param {UUID} contractorId - Contractor ID
 * @param {string} trainingType - Type of training (free text)
 * @param {File} file - File to upload
 * @param {Date|string} expiryDate - Optional expiry date
 * @param {string} notes - Optional notes
 * @returns {Object} Upload result
 */
export async function uploadTrainingRecord(
  contractorId,
  trainingType,
  file,
  expiryDate = null,
  notes = '',
  companyId = null
) {
  try {
    console.log('📤 Uploading training record:', { contractorId, trainingType, fileName: file.name });

    // Validate file type
    if (!isValidFileType(file)) {
      throw new Error('Only PDF and image files (JPG, PNG, GIF, WebP) are allowed');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    const { contractorName, companyName } = await getContractorStorageContext(contractorId, companyId);
    const fileType = normalizeFileType(file);

    // Generate readable file path: company/contractor/training_type/timestamp.ext
    const fileExt = file.name.split('.').pop();
    const fileName = buildTrainingRecordStoragePath({
      companyName,
      contractorName,
      trainingType,
      fileExt,
    });

    // Upload file to Supabase Storage
    console.log('📁 Uploading to storage:', fileName);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('training-records')
      .upload(fileName, file, { contentType: fileType });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ File uploaded to storage');

    console.log('📥 Creating training record in DB');

    const fileReference = trainingRecordsFileReference(fileName);

    // Create record in database
    const { data: record, error: dbError } = await supabase
      .from('training_records')
      .insert([{
        contractor_id: contractorId,
        training_type: trainingType,
        file_name: file.name,
        file_url: fileReference,
        file_size: file.size,
        file_type: fileType,
        expiry_date: formatDateForDb(expiryDate),
        notes: notes || null,
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
    let counterCompanyId = companyId;
    if (!counterCompanyId) {
      counterCompanyId = await resolveContractorCompanyId(contractorId);
    }

    if (counterCompanyId) {
      await updateCompanyTrainingRecordsCounters(counterCompanyId);
    }
    
    return { success: true, data: record, message: `Training record uploaded for ${trainingType}` };
  } catch (error) {
    console.error('❌ Upload training record error:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to upload training record') };
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

    if (preferTrainingRecordsEdgeForAdmin()) {
      try {
        const data = await trainingRecordsDataListByContractor(contractorId);
        console.log(`✅ Fetched ${data.length} training records (edge)`);
        return { success: true, data };
      } catch (edgeError) {
        console.warn('getTrainingRecords edge failed, fallback:', edgeError?.message);
      }
    }

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

    if (preferTrainingRecordsEdgeForAdmin()) {
      try {
        const sortedRecords = await trainingRecordsDataListByCompany(companyId);
        console.log(`✅ Fetched ${sortedRecords.length} training records for company (edge)`);
        return { success: true, data: sortedRecords };
      } catch (edgeError) {
        console.warn('getTrainingRecordsByCompany edge failed, fallback:', edgeError?.message);
      }
    }

    const contractors = await loadContractorsForCompany(companyId);
    const contractorById = new Map((contractors || []).map((c) => [c.id, c]));
    const contractorIds = [...contractorById.keys()];
    if (contractorIds.length === 0) {
      return { success: true, data: [] };
    }

    const records = await fetchAllBatchedByIds(contractorIds, (batch) =>
      supabase.from('training_records').select('*').in('contractor_id', batch),
    );

    const sortedRecords = (records || [])
      .map((record) => {
        const contractor = contractorById.get(record.contractor_id);
        return {
          ...record,
          contractor: {
            id: record.contractor_id,
            name: contractor?.name || 'Unknown',
            company_id: companyId,
          },
        };
      })
      .sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));

    console.log(`✅ Fetched ${sortedRecords.length} training records for company`);
    return { success: true, data: sortedRecords };
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

    let record = null;
    if (preferTrainingRecordsEdgeForAdmin()) {
      try {
        record = await trainingRecordsDataGet(recordId);
      } catch (edgeError) {
        console.warn('deleteTrainingRecord edge get failed, fallback:', edgeError?.message);
      }
    }
    if (!record) {
      const { data } = await supabase
        .from('training_records')
        .select('contractor_id')
        .eq('id', recordId)
        .single();
      record = data;
    }

    // Extract file path from URL and delete from storage
    if (fileUrl) {
      try {
        const filePath = extractTrainingRecordsStoragePath(fileUrl);
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

    if (preferTrainingRecordsEdgeForAdmin()) {
      try {
        await trainingRecordsDataDelete(recordId);
      } catch (edgeError) {
        console.warn('deleteTrainingRecord edge delete failed, fallback:', edgeError?.message);
        const { error } = await supabase.from('training_records').delete().eq('id', recordId);
        if (error) throw error;
      }
    } else {
      const { error } = await supabase.from('training_records').delete().eq('id', recordId);
      if (error) throw error;
    }

    console.log('✅ Training record deleted');
    
    // Update company counters
    if (record?.contractor_id) {
      const counterCompanyId = await resolveContractorCompanyId(record.contractor_id);
      if (counterCompanyId) {
        await updateCompanyTrainingRecordsCounters(counterCompanyId);
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

    let recordData = null;
    let data = null;

    if (preferTrainingRecordsEdgeForAdmin()) {
      try {
        recordData = await trainingRecordsDataGet(recordId);
        data = await trainingRecordsDataApprove(recordId, approvedByName, businessUnitName);
      } catch (edgeError) {
        console.warn('approveTrainingRecord edge failed, fallback:', edgeError?.message);
      }
    }

    if (!data) {
      const { data: fetched } = await supabase
        .from('training_records')
        .select('contractor_id')
        .eq('id', recordId)
        .single();
      recordData = fetched;

      const { data: updated, error } = await supabase
        .from('training_records')
        .update({
          status: 'approved',
          approved_by_name: approvedByName,
          approved_by_business_unit: businessUnitName,
          approved_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      data = updated;
    }

    console.log('✅ Training record approved');
    
    // Update company counters
    if (recordData?.contractor_id) {
      const counterCompanyId = await resolveContractorCompanyId(recordData.contractor_id);
      if (counterCompanyId) {
        await updateCompanyTrainingRecordsCounters(counterCompanyId);
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

    let company = null;
    if (preferCompanyEdgeForAdmin()) {
      company = await fetchCompanyRowViaEdge(companyId);
    } else {
      const { data, error: companyError } = await supabase
        .from('companies')
        .select('training_records_total, training_records_approved')
        .eq('id', companyId)
        .single();
      if (companyError) throw companyError;
      company = data;
    }

    const result = trainingRecordsStatusFromRow(company);
    console.log(
      `✅ Training records status: ${result.status} (${result.approved}/${result.total} approved)`,
    );
    return result;
  } catch (error) {
    console.error('❌ Get training records status error:', error);
    return { success: false, error: error.message, status: 'none' };
  }
}

/**
 * Get training records status for multiple companies in a single batch query
 * PERFORMANCE OPTIMIZATION: Reduces N+1 queries to 1 batch query
 * RELIABILITY: Auto-retries on network failure, returns partial results
 * @param {Array<UUID>} companyIds - Array of company IDs
 * @returns {Promise<Object>} - Object with companyId as key and status object as value
 */
export async function getCompanyTrainingRecordsStatusBatch(companyIds) {
  if (!companyIds || companyIds.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  No company IDs provided for batch status query');
    }
    return {};
  }

  console.log(`📦 Getting training records statuses for ${companyIds.length} companies in batch...`);

  let lastError;
  const maxRetries = 3;
  const baseDelay = 1000;

  // Retry logic for transient network failures
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const companies = preferCompanyEdgeForAdmin()
        ? await fetchCompanyRowsByIdsViaEdge(companyIds)
        : await fetchAllBatchedByIds(companyIds, (batch) =>
            supabase
              .from('companies')
              .select('id, training_records_total, training_records_approved')
              .in('id', batch),
          );

      // Map results to status objects
      const statusMap = {};
      
      // Initialize all requested companies with 'none' status
      companyIds.forEach(id => {
        statusMap[id] = {
          success: true,
          status: 'none',
          total: 0,
          approved: 0,
          pending: 0
        };
      });

      // Update with actual data for companies that were found
      (companies || []).forEach((company) => {
        statusMap[company.id] = trainingRecordsStatusFromRow(company);
      });

      console.log(`✅ Batch query complete: fetched ${companies?.length || 0} companies`);
      return statusMap;
    } catch (error) {
      lastError = error;

      if (process.env.NODE_ENV === 'development') {
        console.warn(`⏳ Training records batch attempt ${attempt}/${maxRetries} failed:`, error.message);
      }

      // Retry if not the last attempt
      if (attempt < maxRetries) {
        const delayMs = baseDelay * attempt;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted - log error but don't crash
  handleError(lastError, 'loading training records statuses', false);
  console.error('❌ Failed to load training records statuses after retries');
  
  // Return empty map so app continues to function
  return {};
}

/**
 * Approve all pending training records for a company at once
 * Updates both individual records and company-level status
 * RELIABILITY: Partial success supported - some records may be approved even if some fail
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

    let approvedCount = pendingRecords.length;
    if (preferTrainingRecordsEdgeForAdmin()) {
      try {
        const edgeResult = await trainingRecordsDataApproveAllPending(
          companyId,
          approvedByName,
          businessUnitName,
        );
        approvedCount = edgeResult.approvedCount ?? pendingRecords.length;
      } catch (edgeError) {
        console.warn('approveAllCompanyTrainingRecords edge failed, fallback:', edgeError?.message);
        const approvalPromises = pendingRecords.map((record) =>
          supabase
            .from('training_records')
            .update({
              status: 'approved',
              approved_by_name: approvedByName,
              approved_by_business_unit: businessUnitName,
              approved_at: new Date().toISOString(),
            })
            .eq('id', record.id),
        );
        const { succeeded, failed } = await safePromiseAll(
          approvalPromises,
          `approving ${pendingRecords.length} training records`,
        );
        if (failed.length > 0) {
          console.warn(`⚠️  Partially approved: ${succeeded.length} succeeded, ${failed.length} failed`);
        }
        approvedCount = succeeded.length;
      }
    } else {
      const approvalPromises = pendingRecords.map((record) =>
        supabase
          .from('training_records')
          .update({
            status: 'approved',
            approved_by_name: approvedByName,
            approved_by_business_unit: businessUnitName,
            approved_at: new Date().toISOString(),
          })
          .eq('id', record.id),
      );
      const { succeeded, failed } = await safePromiseAll(
        approvalPromises,
        `approving ${pendingRecords.length} training records`,
      );
      if (failed.length > 0) {
        console.warn(`⚠️  Partially approved: ${succeeded.length} succeeded, ${failed.length} failed`);
      }
      approvedCount = succeeded.length;
    }

    // Update company-level status (use succeeded count)
    const workflowUpdates = {
      training_records_status: 'approved',
      training_records_approved_at: new Date().toISOString(),
      training_records_approved_by: approvedByName,
    };

    if (preferCompanyEdgeForAdmin()) {
      await updateCompany(companyId, workflowUpdates);
    } else {
      const { error: companyError } = await supabase.from('companies').update(workflowUpdates).eq('id', companyId);
      if (companyError) throw companyError;
    }

    await updateCompanyTrainingRecordsCounters(companyId);

    console.log(`✅ Approved ${approvedCount} training records for company`);
    return {
      success: true,
      message: `Approved ${approvedCount} training records`,
      approvedCount,
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

    let record = null;
    if (preferTrainingRecordsEdgeForAdmin()) {
      try {
        record = await trainingRecordsDataGet(recordId);
      } catch (edgeError) {
        console.warn('updateTrainingRecord edge get failed, fallback:', edgeError?.message);
      }
    }
    if (!record) {
      const { data, error: fetchError } = await supabase
        .from('training_records')
        .select('*')
        .eq('id', recordId)
        .single();
      if (fetchError) throw fetchError;
      record = data;
    }

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

      const { contractorName, companyName } = await getContractorStorageContext(record.contractor_id);
      const fileType = normalizeFileType(file);

      // Generate readable file path: company/contractor/training_type/timestamp.ext
      const fileExt = file.name.split('.').pop();
      const fileName = buildTrainingRecordStoragePath({
        companyName,
        contractorName,
        trainingType: record.training_type,
        fileExt,
      });

      // Upload new file to storage
      console.log('📁 Uploading to storage:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training-records')
        .upload(fileName, file, { contentType: fileType });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw uploadError;
      }

      const fileReference = trainingRecordsFileReference(fileName);

      // Delete old file from storage if exists
      if (record.file_url) {
        try {
          const oldFilePath = extractTrainingRecordsStoragePath(record.file_url);
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

      updateData.file_url = fileReference;
      updateData.file_name = file.name;
      updateData.file_size = file.size;
      updateData.file_type = fileType;

      // Reset status to pending since new file uploaded
      updateData.status = 'pending';
      updateData.approved_at = null;
      updateData.approved_by_name = null;
      updateData.approved_by_business_unit = null;
    }

    // Update expiry date if provided
    if (expiryDate) {
      updateData.expiry_date = formatDateForDb(expiryDate);
    }

    console.log('💾 Updating training record in database');
    let updatedRecord = null;
    if (preferTrainingRecordsEdgeForAdmin() && Object.keys(updateData).length > 0) {
      try {
        updatedRecord = await trainingRecordsDataUpdate(recordId, updateData);
      } catch (edgeError) {
        console.warn('updateTrainingRecord edge update failed, fallback:', edgeError?.message);
      }
    }
    if (!updatedRecord) {
      const { data, error: updateError } = await supabase
        .from('training_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();
      if (updateError) throw updateError;
      updatedRecord = data;
    }

    console.log('✅ Training record updated:', recordId);
    
    // Update company counters (status might have changed)
    if (record?.contractor_id) {
      const counterCompanyId = await resolveContractorCompanyId(record.contractor_id);
      if (counterCompanyId) {
        await updateCompanyTrainingRecordsCounters(counterCompanyId);
      }
    }

    return { success: true, data: updatedRecord, message: 'Training record updated' };
  } catch (error) {
    console.error('❌ Update training record error:', error);
    return { success: false, error: getErrorMessage(error, 'Failed to update training record') };
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

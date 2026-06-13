/**
 * Company Training Matrices API
 * Handles company-level training matrix uploads covering multiple contractors.
 * Kept separate from trainingRecords.js to avoid impacting live individual records.
 */

import { supabase } from '../supabaseClient';
import { safePromiseAll } from '../utils/errorHandler';
import {
  buildCompanyTrainingMatrixStoragePath,
  extractTrainingRecordsStoragePath,
} from '../utils/storagePaths';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

function isValidFileType(file) {
  if (ALLOWED_FILE_TYPES.includes(file.type)) {
    return true;
  }
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function defaultNameFromFile(file) {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return baseName || 'Training Matrix';
}

async function getCompanyName(companyId) {
  const { data, error } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();

  if (error) {
    throw error;
  }

  return data?.name || 'unknown_company';
}

async function updateCompanyTrainingMatricesCounters(companyId) {
  try {
    const { data: matrices, error } = await supabase
      .from('company_training_matrices')
      .select('id, status')
      .eq('company_id', companyId);

    if (error) throw error;

    const total = matrices?.length || 0;
    const approved = (matrices || []).filter(m => m.status === 'approved').length;

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        training_matrices_total: total,
        training_matrices_approved: approved
      })
      .eq('id', companyId);

    if (updateError) throw updateError;

    return { success: true, total, approved };
  } catch (error) {
    console.error('Error updating training matrix counters:', error);
    return { success: false, error: error.message };
  }
}

async function syncMatrixContractors(matrixId, contractorIds) {
  const { error: deleteError } = await supabase
    .from('company_training_matrix_contractors')
    .delete()
    .eq('matrix_id', matrixId);

  if (deleteError) throw deleteError;

  if (!contractorIds || contractorIds.length === 0) {
    return;
  }

  const rows = contractorIds.map(contractorId => ({
    matrix_id: matrixId,
    contractor_id: contractorId
  }));

  const { error: insertError } = await supabase
    .from('company_training_matrix_contractors')
    .insert(rows);

  if (insertError) throw insertError;
}

async function enrichMatricesWithContractors(matrices) {
  if (!matrices || matrices.length === 0) {
    return [];
  }

  const matrixIds = matrices.map(m => m.id);
  const { data: links, error } = await supabase
    .from('company_training_matrix_contractors')
    .select(`
      matrix_id,
      contractor:contractors(id, name)
    `)
    .in('matrix_id', matrixIds);

  if (error) throw error;

  const contractorsByMatrix = {};
  (links || []).forEach(link => {
    if (!contractorsByMatrix[link.matrix_id]) {
      contractorsByMatrix[link.matrix_id] = [];
    }
    if (link.contractor) {
      contractorsByMatrix[link.matrix_id].push(link.contractor);
    }
  });

  return matrices.map(matrix => ({
    ...matrix,
    contractors: contractorsByMatrix[matrix.id] || []
  }));
}

/**
 * Upload a company training matrix
 */
export async function uploadCompanyTrainingMatrix(
  companyId,
  name,
  file,
  contractorIds,
  expiryDate = null,
  uploadedBy = ''
) {
  try {
    if (!companyId) throw new Error('Company ID is required');
    if (!file) throw new Error('Please attach a file');
    if (!contractorIds || contractorIds.length === 0) {
      throw new Error('Please select at least one person covered by this matrix');
    }
    if (!isValidFileType(file)) {
      throw new Error('Only PDF and image files (JPG, PNG, GIF, WebP) are allowed');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    const matrixName = (name || '').trim() || defaultNameFromFile(file);
    const companyName = await getCompanyName(companyId);
    const fileExt = file.name.split('.').pop();
    const storagePath = buildCompanyTrainingMatrixStoragePath({
      companyName,
      fileExt,
    });

    const { error: uploadError } = await supabase.storage
      .from('training-records')
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('training-records')
      .getPublicUrl(storagePath);

    const { data: matrix, error: dbError } = await supabase
      .from('company_training_matrices')
      .insert([{
        company_id: companyId,
        name: matrixName,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type || 'application/pdf',
        expiry_date: expiryDate,
        uploaded_by: uploadedBy,
        status: 'pending'
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    await syncMatrixContractors(matrix.id, contractorIds);
    await updateCompanyTrainingMatricesCounters(companyId);

    const enriched = await enrichMatricesWithContractors([matrix]);
    return {
      success: true,
      data: enriched[0],
      message: `Training matrix "${matrixName}" uploaded`
    };
  } catch (error) {
    console.error('Upload company training matrix error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all training matrices for a company
 */
export async function getCompanyTrainingMatrices(companyId) {
  try {
    const { data, error } = await supabase
      .from('company_training_matrices')
      .select('*')
      .eq('company_id', companyId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    const enriched = await enrichMatricesWithContractors(data || []);
    return { success: true, data: enriched };
  } catch (error) {
    console.error('Get company training matrices error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Update a training matrix (name, file, expiry, covered contractors)
 * Resets to pending if previously approved and material fields change
 */
export async function updateCompanyTrainingMatrix(
  matrixId,
  {
    name = null,
    file = null,
    expiryDate = undefined,
    contractorIds = null
  } = {}
) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('company_training_matrices')
      .select('*')
      .eq('id', matrixId)
      .single();

    if (fetchError) throw fetchError;

    const updateData = { updated_at: new Date().toISOString() };
    let requiresReapproval = false;

    if (name !== null && name.trim() !== existing.name) {
      updateData.name = name.trim();
    }

    if (expiryDate !== undefined) {
      const existingExpiry = existing.expiry_date || null;
      const newExpiry = expiryDate || null;
      if (existingExpiry !== newExpiry) {
        updateData.expiry_date = newExpiry;
      }
    }

    if (file) {
      if (!isValidFileType(file)) {
        throw new Error('Only PDF and image files (JPG, PNG, GIF, WebP) are allowed');
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
      }

      const companyName = await getCompanyName(existing.company_id);
      const fileExt = file.name.split('.').pop();
      const storagePath = buildCompanyTrainingMatrixStoragePath({
        companyName,
        fileExt,
      });

      const { error: uploadError } = await supabase.storage
        .from('training-records')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('training-records')
        .getPublicUrl(storagePath);

      if (existing.file_url) {
        try {
          const oldFilePath = extractTrainingRecordsStoragePath(existing.file_url);
          if (oldFilePath) {
            await supabase.storage.from('training-records').remove([oldFilePath]);
          }
        } catch (storageError) {
          console.warn('Warning deleting old matrix file:', storageError);
        }
      }

      updateData.file_url = publicUrl;
      updateData.file_name = file.name;
      updateData.file_size = file.size;
      updateData.file_type = file.type || 'application/pdf';
      requiresReapproval = true;
    }

    if (contractorIds !== null) {
      const { data: currentLinks } = await supabase
        .from('company_training_matrix_contractors')
        .select('contractor_id')
        .eq('matrix_id', matrixId);

      const currentIds = (currentLinks || []).map(l => l.contractor_id).sort().join(',');
      const newIds = [...contractorIds].sort().join(',');

      if (currentIds !== newIds) {
        if (!contractorIds.length) {
          throw new Error('Please select at least one person covered by this matrix');
        }
        await syncMatrixContractors(matrixId, contractorIds);
        requiresReapproval = true;
      }
    }

    if (requiresReapproval && existing.status === 'approved') {
      updateData.status = 'pending';
      updateData.approved_at = null;
      updateData.approved_by_name = null;
      updateData.approved_by_business_unit = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('company_training_matrices')
      .update(updateData)
      .eq('id', matrixId)
      .select()
      .single();

    if (updateError) throw updateError;

    await updateCompanyTrainingMatricesCounters(existing.company_id);

    const enriched = await enrichMatricesWithContractors([updated]);
    return { success: true, data: enriched[0], message: 'Training matrix updated' };
  } catch (error) {
    console.error('Update company training matrix error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a training matrix
 */
export async function deleteCompanyTrainingMatrix(matrixId, fileUrl) {
  try {
    const { data: matrix, error: fetchError } = await supabase
      .from('company_training_matrices')
      .select('company_id')
      .eq('id', matrixId)
      .single();

    if (fetchError) throw fetchError;

    if (fileUrl) {
      try {
        const filePath = extractTrainingRecordsStoragePath(fileUrl);
        if (filePath) {
          await supabase.storage.from('training-records').remove([filePath]);
        }
      } catch (storageError) {
        console.warn('Warning deleting matrix file from storage:', storageError);
      }
    }

    const { error } = await supabase
      .from('company_training_matrices')
      .delete()
      .eq('id', matrixId);

    if (error) throw error;

    await updateCompanyTrainingMatricesCounters(matrix.company_id);
    return { success: true, message: 'Training matrix deleted' };
  } catch (error) {
    console.error('Delete company training matrix error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve a single training matrix
 */
export async function approveCompanyTrainingMatrix(matrixId, approvedByName, businessUnitName = '') {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('company_training_matrices')
      .select('company_id')
      .eq('id', matrixId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('company_training_matrices')
      .update({
        status: 'approved',
        approved_by_name: approvedByName,
        approved_by_business_unit: businessUnitName,
        approved_at: new Date().toISOString()
      })
      .eq('id', matrixId)
      .select()
      .single();

    if (error) throw error;

    await updateCompanyTrainingMatricesCounters(existing.company_id);

    const enriched = await enrichMatricesWithContractors([data]);
    return { success: true, data: enriched[0] };
  } catch (error) {
    console.error('Approve company training matrix error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve all pending training matrices for a company
 */
export async function approveAllCompanyTrainingMatrices(companyId, approvedByName, businessUnitName = '') {
  try {
    const { data: pending, error: fetchError } = await supabase
      .from('company_training_matrices')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'pending');

    if (fetchError) throw fetchError;

    if (!pending || pending.length === 0) {
      return { success: true, message: 'No pending matrices to approve', approvedCount: 0 };
    }

    const approvalPromises = pending.map(matrix =>
      supabase
        .from('company_training_matrices')
        .update({
          status: 'approved',
          approved_by_name: approvedByName,
          approved_by_business_unit: businessUnitName,
          approved_at: new Date().toISOString()
        })
        .eq('id', matrix.id)
    );

    const { succeeded, failed } = await safePromiseAll(
      approvalPromises,
      `approving ${pending.length} training matrices`
    );

    if (failed.length > 0) {
      console.warn(`Partially approved matrices: ${succeeded.length} succeeded, ${failed.length} failed`);
    }

    await updateCompanyTrainingMatricesCounters(companyId);

    return {
      success: true,
      message: `Approved ${succeeded.length} training matrices`,
      approvedCount: succeeded.length
    };
  } catch (error) {
    console.error('Approve all company training matrices error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get training matrix status for a company (separate from individual records)
 */
export async function getCompanyTrainingMatricesStatus(companyId) {
  try {
    const { data: company, error } = await supabase
      .from('companies')
      .select('training_matrices_total, training_matrices_approved')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    const total = company?.training_matrices_total || 0;
    const approved = company?.training_matrices_approved || 0;

    let status = 'none';
    if (total > 0) {
      status = approved === total ? 'approved' : 'added';
    }

    return { success: true, status, total, approved, pending: total - approved };
  } catch (error) {
    console.error('Get training matrices status error:', error);
    return { success: false, error: error.message, status: 'none' };
  }
}

/**
 * Batch training matrix status for multiple companies
 */
export async function getCompanyTrainingMatricesStatusBatch(companyIds) {
  if (!companyIds || companyIds.length === 0) {
    return {};
  }

  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, training_matrices_total, training_matrices_approved')
      .in('id', companyIds);

    if (error) throw error;

    const statusMap = {};
    companyIds.forEach(id => {
      statusMap[id] = { success: true, status: 'none', total: 0, approved: 0, pending: 0 };
    });

    (companies || []).forEach(company => {
      const total = company?.training_matrices_total || 0;
      const approved = company?.training_matrices_approved || 0;
      let status = 'none';
      if (total > 0) {
        status = approved === total ? 'approved' : 'added';
      }
      statusMap[company.id] = { success: true, status, total, approved, pending: total - approved };
    });

    return statusMap;
  } catch (error) {
    console.error('Get training matrices status batch error:', error);
    return {};
  }
}

export async function updateCompanyTrainingMatricesStatus(companyId) {
  return updateCompanyTrainingMatricesCounters(companyId);
}

export { defaultNameFromFile };

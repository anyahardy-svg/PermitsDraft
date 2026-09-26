/**
 * Inductions API - Simplified single-table schema
 * Handles induction management for contractor training
 */

import { supabase } from '../supabaseClient';
import { safePromiseAll } from '../utils/errorHandler';
import { fetchAllBatchedByIds, fetchAllPaginated } from './pagination';
import {
  syncSiteInductionRecordsFromProgress,
  upsertContractorSiteInduction,
} from './contractorInductions';
import {
  contractorDataListByCompany,
  contractorDataListIncompleteInductions,
  getRequestingAdminId,
  isAdminSessionActive,
} from './contractorData';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function formatInductionDisplayName(induction) {
  if (!induction) return '';
  return (induction.induction_name || '').trim();
}

export function normalizeInductionLookupKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function buildInductionNameLookup(inductions = []) {
  const lookup = new Map();

  const addKey = (key, inductionId) => {
    const normalized = normalizeInductionLookupKey(key);
    if (normalized && inductionId) {
      lookup.set(normalized, inductionId);
    }
  };

  for (const induction of inductions) {
    if (!induction?.id) {
      continue;
    }
    addKey(formatInductionDisplayName(induction), induction.id);
    addKey(induction.induction_name, induction.id);
  }

  return lookup;
}

export function resolveInductionIdFromImportName(name, lookup) {
  const normalized = normalizeInductionLookupKey(name);
  if (!normalized || !lookup) {
    return null;
  }

  if (lookup.has(normalized)) {
    return lookup.get(normalized);
  }

  if (normalized.endsWith('s') && lookup.has(normalized.slice(0, -1))) {
    return lookup.get(normalized.slice(0, -1));
  }

  if (lookup.has(`${normalized}s`)) {
    return lookup.get(`${normalized}s`);
  }

  const colonIdx = normalized.lastIndexOf(':');
  if (colonIdx >= 0) {
    const suffix = normalizeInductionLookupKey(normalized.slice(colonIdx + 1));
    if (suffix) {
      const suffixMatch = resolveInductionIdFromImportName(suffix, lookup);
      if (suffixMatch) {
        return suffixMatch;
      }
    }
  }

  return null;
}

export function resolveInductionIdsFromImportNames(names = [], lookup) {
  const resolvedIds = [];

  for (const name of names) {
    const matchId = resolveInductionIdFromImportName(name, lookup);
    if (matchId) {
      resolvedIds.push(matchId);
    }
  }

  return [...new Set(resolvedIds)];
}

// ============================================================================
// TIMEZONE UTILITY
// ============================================================================

/**
 * Get current timestamp in NZ timezone
 * @returns {string} ISO string with NZ timezone info
 */
function getNZTimestamp() {
  const now = new Date();
  return now.toLocaleString('en-NZ', { 
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// ============================================================================
// INDUCTIONS MANAGEMENT (Creation, Reading, Updating, Deleting)
// ============================================================================

function parseForceCompulsoryServiceIdList(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.filter(Boolean);
  }
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed || trimmed === '{}') {
      return [];
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((id) => id.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

export function getForceCompulsoryServiceIds(induction) {
  const forceServiceIds = new Set();
  parseForceCompulsoryServiceIdList(induction?.force_compulsory_with_service_ids)
    .forEach((id) => forceServiceIds.add(id));
  if (induction?.force_compulsory_with_service_id) {
    forceServiceIds.add(induction.force_compulsory_with_service_id);
  }
  return Array.from(forceServiceIds);
}

function normalizeForceCompulsoryServiceIds(inductionData) {
  const ids = getForceCompulsoryServiceIds(inductionData);
  return ids.filter(Boolean);
}

function normalizeInductionRecord(induction) {
  if (!induction) return induction;
  const forceCompulsoryServiceIds = getForceCompulsoryServiceIds(induction);
  return {
    ...induction,
    force_compulsory_with_service_ids: forceCompulsoryServiceIds,
    force_compulsory_with_service_id: forceCompulsoryServiceIds[0] || null,
  };
}

function isMissingForceServiceIdsColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    message.includes('force_compulsory_with_service_ids') &&
    (message.includes('does not exist') ||
      message.includes('could not find') ||
      message.includes('schema cache'))
  );
}

function createForceCompulsoryMigrationError() {
  const migrationError = new Error(
    'Saving multiple force-compulsory services requires a database update. Please run migration migrations/add-force-compulsory-service-ids-array.sql.'
  );
  migrationError.code = 'FORCE_COMPULSORY_MIGRATION_REQUIRED';
  return migrationError;
}

function applyForceCompulsoryFields(record, forceCompulsoryServiceIds, includeArrayColumn = true) {
  record.force_compulsory_with_service_id = forceCompulsoryServiceIds[0] || null;
  if (includeArrayColumn) {
    record.force_compulsory_with_service_ids = forceCompulsoryServiceIds;
  }
  return record;
}

/**
 * Get all inductions
 * @returns {Array} All inductions
 */
export async function getAllInductions() {
  try {
    const { data, error } = await supabase
      .from('inductions')
      .select('*')
      .order('induction_name', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeInductionRecord);
  } catch (error) {
    console.error('Error fetching inductions:', error);
    throw error;
  }
}

/**
 * Get inductions for a specific business unit
 * @param {UUID} businessUnitId
 * @returns {Array} Inductions for the business unit
 */
export async function getInductionsByBusinessUnit(businessUnitId, contractorServiceIds = [], { skipServiceFilter = false } = {}) {
  try {
    let query = supabase
      .from('inductions')
      .select('*')
      .overlaps('business_unit_ids', [businessUnitId]);

    const { data, error } = await query.order('induction_name', { ascending: true });

    if (error) throw error;

    if (skipServiceFilter) {
      return (data || []).map(normalizeInductionRecord);
    }
    
    // Filter by services in JavaScript (easier than complex SQL OR conditions)
    const filtered = data?.filter(induction => {
      // If induction has no service_id, it applies to everyone
      if (!induction.service_id) {
        return true;
      }
      // If induction requires a specific service, contractor must have that service
      if (contractorServiceIds && contractorServiceIds.length > 0) {
        return contractorServiceIds.includes(induction.service_id);
      }
      // Contractor has no services and induction requires a service = don't show
      return false;
    }) || [];

    return filtered.map(normalizeInductionRecord);
  } catch (error) {
    console.error('Error fetching inductions for business unit:', error);
    throw error;
  }
}

/**
 * Get inductions for a specific site
 * @param {UUID} siteId
 * @returns {Array} Inductions applicable to the site
 */
export async function getInductionsBySite(siteId) {
  try {
    const { data, error } = await supabase
      .from('inductions')
      .select('*')
      .or(`site_id.eq.${siteId},site_id.is.null`) // Site-specific OR applies to all sites
      .order('induction_name', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeInductionRecord);
  } catch (error) {
    console.error('Error fetching inductions for site:', error);
    throw error;
  }
}

/**
 * Get inductions for a contractor (based on their business unit)
 * @param {UUID} contractorId
 * @param {UUID} businessUnitId (optional - if available)
 * @returns {Array} Applicable inductions
 */
export async function getInductionsForContractor(contractorId, businessUnitId) {
  try {
    let query = supabase.from('inductions').select('*');

    if (businessUnitId) {
      query = query.contains('business_unit_ids', [businessUnitId]);
    }

    const { data, error } = await query.order('induction_name', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeInductionRecord);
  } catch (error) {
    console.error('Error fetching inductions for contractor:', error);
    throw error;
  }
}

/**
 * Get compulsory inductions for a business unit
 * @param {UUID} businessUnitId
 * @returns {Array} Compulsory inductions
 */
export async function getCompulsoryInductions(businessUnitId) {
  try {
    const { data, error } = await supabase
      .from('inductions')
      .select('*')
      .contains('business_unit_ids', [businessUnitId])
      .eq('is_compulsory', true)
      .order('induction_name', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeInductionRecord);
  } catch (error) {
    console.error('Error fetching compulsory inductions:', error);
    throw error;
  }
}

/**
 * Create a new induction
 * @param {Object} inductionData - { induction_name, description, business_unit_ids, site_id, service_id, force_compulsory_with_service_ids, video_url, video_duration, question_X_text, question_X_options, question_X_correct_answer, question_X_type, is_compulsory }
 * @returns {Object} Created induction
 */
export async function createInduction(inductionData) {
  try {
    const forceCompulsoryServiceIds = normalizeForceCompulsoryServiceIds(inductionData);
    const insertData = applyForceCompulsoryFields({
      induction_name: inductionData.induction_name,
      description: inductionData.description || '',
      business_unit_ids: inductionData.business_unit_ids || [],
      site_id: inductionData.site_id || null,
      service_id: inductionData.service_id || null,
      video_url: inductionData.video_url || '',
      video_duration: inductionData.video_duration ? parseInt(inductionData.video_duration) : 0,
      pdf_file_name: inductionData.pdf_file_name || '',
      pdf_file_url: inductionData.pdf_file_url || '',
      question_1_text: inductionData.question_1_text || '',
      question_1_options: inductionData.question_1_options || null,
      question_1_correct_answer: inductionData.question_1_correct_answer ?? null,
      question_1_type: inductionData.question_1_type || 'single-select',
      question_2_text: inductionData.question_2_text || '',
      question_2_options: inductionData.question_2_options || null,
      question_2_correct_answer: inductionData.question_2_correct_answer ?? null,
      question_2_type: inductionData.question_2_type || 'single-select',
      question_3_text: inductionData.question_3_text || '',
      question_3_options: inductionData.question_3_options || null,
      question_3_correct_answer: inductionData.question_3_correct_answer ?? null,
      question_3_type: inductionData.question_3_type || 'single-select',
      is_compulsory: inductionData.is_compulsory !== false,
    }, forceCompulsoryServiceIds);

    let { data, error } = await supabase
      .from('inductions')
      .insert([insertData])
      .select();

    if (error && isMissingForceServiceIdsColumnError(error)) {
      if (forceCompulsoryServiceIds.length > 1) {
        throw createForceCompulsoryMigrationError();
      }
      const legacyInsertData = applyForceCompulsoryFields({
        ...insertData,
      }, forceCompulsoryServiceIds, false);
      delete legacyInsertData.force_compulsory_with_service_ids;
      ({ data, error } = await supabase
        .from('inductions')
        .insert([legacyInsertData])
        .select());
    }

    if (error) throw error;
    return data ? normalizeInductionRecord(data[0]) : null;
  } catch (error) {
    console.error('Error creating induction:', error);
    throw error;
  }
}

/**
 * Update an induction
 * @param {UUID} inductionId
 * @param {Object} updates
 * @returns {Object} Updated induction
 */
export async function updateInduction(inductionId, updates) {
  try {
    const forceCompulsoryServiceIds = normalizeForceCompulsoryServiceIds(updates);
    const updateData = applyForceCompulsoryFields({
      induction_name: updates.induction_name,
      description: updates.description || '',
      business_unit_ids: updates.business_unit_ids || [],
      site_id: updates.site_id || null,
      service_id: updates.service_id || null,
      video_url: updates.video_url || '',
      video_duration: updates.video_duration ? parseInt(updates.video_duration) : 0,
      pdf_file_name: updates.pdf_file_name || '',
      pdf_file_url: updates.pdf_file_url || '',
      question_1_text: updates.question_1_text || '',
      question_1_options: updates.question_1_options || null,
      question_1_correct_answer: updates.question_1_correct_answer ?? null,
      question_1_type: updates.question_1_type || 'single-select',
      question_2_text: updates.question_2_text || '',
      question_2_options: updates.question_2_options || null,
      question_2_correct_answer: updates.question_2_correct_answer ?? null,
      question_2_type: updates.question_2_type || 'single-select',
      question_3_text: updates.question_3_text || '',
      question_3_options: updates.question_3_options || null,
      question_3_correct_answer: updates.question_3_correct_answer ?? null,
      question_3_type: updates.question_3_type || 'single-select',
      is_compulsory: updates.is_compulsory !== false,
      updated_at: new Date().toISOString(),
    }, forceCompulsoryServiceIds);

    let { data, error } = await supabase
      .from('inductions')
      .update(updateData)
      .eq('id', inductionId)
      .select();

    if (error && isMissingForceServiceIdsColumnError(error)) {
      if (forceCompulsoryServiceIds.length > 1) {
        throw createForceCompulsoryMigrationError();
      }
      const legacyUpdateData = applyForceCompulsoryFields({
        ...updateData,
      }, forceCompulsoryServiceIds, false);
      delete legacyUpdateData.force_compulsory_with_service_ids;
      ({ data, error } = await supabase
        .from('inductions')
        .update(legacyUpdateData)
        .eq('id', inductionId)
        .select());
    }

    if (error) throw error;
    return data ? normalizeInductionRecord(data[0]) : null;
  } catch (error) {
    console.error('Error updating induction:', error);
    throw error;
  }
}

/**
 * Delete an induction
 * @param {UUID} inductionId
 */
export async function deleteInduction(inductionId) {
  try {
    console.log('🗑️ API: Starting delete for induction ID:', inductionId);
    const { error, data } = await supabase
      .from('inductions')
      .delete()
      .eq('id', inductionId)
      .select();

    console.log('🗑️ API: Delete response - Error:', error, 'Data:', data);
    
    if (error) {
      console.error('🗑️ API: Supabase error during delete:', error);
      throw error;
    }
    
    console.log('🗑️ API: Delete successful');
    return data;
  } catch (error) {
    console.error('❌ API: Error deleting induction:', error);
    throw error;
  }
}

// ============================================================================
// CONTRACTOR INDUCTION PROGRESS TRACKING
// ============================================================================

/**
 * Get contractor's induction progress
 * @param {UUID} contractorId
 * @returns {Array} Induction progress records
 */
export async function getContractorInductionProgress(contractorId) {
  try {
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .select('*, inductions(*)')
      .eq('contractor_id', contractorId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching contractor induction progress:', error);
    throw error;
  }
}

/**
 * Get contractors who have at least one in-progress induction.
 * Uses a single query instead of loading every contractor individually.
 * @returns {Array} Contractors with incompleteCount for each
 */
export async function listContractorsWithIncompleteInductions() {
  const listIncompleteDirect = async () => {
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .select('contractor_id, contractors(*)')
      .eq('status', 'in_progress');

    if (error) throw error;

    const contractorMap = new Map();
    for (const row of data || []) {
      const contractor = row.contractors;
      if (!contractor?.id) continue;

      if (contractorMap.has(contractor.id)) {
        contractorMap.get(contractor.id).incompleteCount += 1;
      } else {
        contractorMap.set(contractor.id, {
          ...contractor,
          incompleteCount: 1,
        });
      }
    }

    return Array.from(contractorMap.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
    );
  };

  try {
    if (!getRequestingAdminId()) {
      try {
        return await contractorDataListIncompleteInductions();
      } catch (edgeError) {
        console.warn('listIncompleteInductions edge failed, trying direct:', edgeError?.message);
      }
    }
    return await listIncompleteDirect();
  } catch (error) {
    console.error('Error fetching contractors with incomplete inductions:', error);
    throw error;
  }
}

/**
 * Get a specific induction progress record
 * @param {UUID} contractorId
 * @param {UUID} inductionId
 * @returns {Object} Progress record or null
 */
export async function getInductionProgress(contractorId, inductionId) {
  try {
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('induction_id', inductionId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching induction progress:', error);
    throw error;
  }
}

/**
 * Start or get an induction for a contractor
 * @param {UUID} contractorId
 * @param {UUID} inductionId
 * @param {Object} options
 * @param {boolean} options.redo - When true, reset completed records to in_progress while keeping saved answers
 * @returns {Object} Progress record
 */
export async function startInduction(contractorId, inductionId, { redo = false } = {}) {
  try {
    // Check if already exists
    const existing = await getInductionProgress(contractorId, inductionId);
    if (existing) {
      if (redo && existing.status === 'completed') {
        const { data, error } = await supabase
          .from('contractor_induction_progress')
          .update({
            status: 'in_progress',
            completed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('contractor_id', contractorId)
          .eq('induction_id', inductionId)
          .select();

        if (error) throw error;
        console.log(`[${getNZTimestamp()}] 🔄 Induction reset for redo (answers preserved)`, { contractorId, inductionId });
        return data ? data[0] : existing;
      }

      console.log(`[${getNZTimestamp()}] ℹ️ Induction already started, resuming`, { contractorId, inductionId, status: existing.status });
      return existing;
    }

    // Create new progress record
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .insert([{
        contractor_id: contractorId,
        induction_id: inductionId,
        status: 'in_progress',
      }])
      .select();

    if (error) throw error;
    console.log(`[${getNZTimestamp()}] ✅ Induction started for contractor`, { contractorId, inductionId });
    return data ? data[0] : null;
  } catch (error) {
    console.error(`[${getNZTimestamp()}] ❌ Error starting induction:`, error);
    throw error;
  }
}

/**
 * Save answers to induction questions
 * @param {UUID} contractorId
 * @param {UUID} inductionId
 * @param {Object} answers - { question_1: 0, question_2: 2, ...}
 * @returns {Object} Updated progress record
 */
export async function saveInductionAnswers(contractorId, inductionId, answers) {
  try {
    console.log(`[${getNZTimestamp()}] 📝 Attempting to save answers`, { contractorId, inductionId, answers });
    
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .update({
        answers: answers || {},
        updated_at: new Date().toISOString(),
      })
      .eq('contractor_id', contractorId)
      .eq('induction_id', inductionId)
      .select();

    if (error) {
      console.error(`[${getNZTimestamp()}] 🔍 PATCH error details:`, error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn(`[${getNZTimestamp()}] ⚠️ No rows updated. Attempting to create record...`);
      // Record might not exist, try to create it
      const { data: insertData, error: insertError } = await supabase
        .from('contractor_induction_progress')
        .insert([{
          contractor_id: contractorId,
          induction_id: inductionId,
          status: 'in_progress',
          answers: answers || {},
        }])
        .select();
      
      if (insertError) {
        console.error(`[${getNZTimestamp()}] ❌ Failed to create record:`, insertError);
        throw insertError;
      }
      console.log(`[${getNZTimestamp()}] ✅ Created new progress record with answers`);
      return insertData ? insertData[0] : null;
    }
    
    console.log(`[${getNZTimestamp()}] 💾 Saved answers for induction`, { contractorId, inductionId, answerCount: Object.keys(answers).length });
    return data[0];
  } catch (error) {
    console.error(`[${getNZTimestamp()}] ❌ Error saving induction answers:`, error);
    throw error;
  }
}

/**
 * Save induction progress without completing (for "Save for Later")
 * @param {UUID} contractorId
 * @param {UUID} inductionId
 * @param {Object} answers - (optional) answers to save
 * @returns {Object} Updated progress record
 */
export async function saveInductionProgress(contractorId, inductionId, answers = {}) {
  try {
    console.log(`[${getNZTimestamp()}] 📌 Saving progress for later`, { contractorId, inductionId });
    
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .update({
        answers: answers || {},
        updated_at: new Date().toISOString(),
        // status stays 'in_progress', don't mark as completed
      })
      .eq('contractor_id', contractorId)
      .eq('induction_id', inductionId)
      .select();

    if (error) {
      console.error(`[${getNZTimestamp()}] 🔍 PATCH error details:`, error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn(`[${getNZTimestamp()}] ⚠️ No rows updated. Attempting to create record...`);
      // Record might not exist, try to create it
      const { data: insertData, error: insertError } = await supabase
        .from('contractor_induction_progress')
        .insert([{
          contractor_id: contractorId,
          induction_id: inductionId,
          status: 'in_progress',
          answers: answers || {},
        }])
        .select();
      
      if (insertError) {
        console.error(`[${getNZTimestamp()}] ❌ Failed to create record:`, insertError);
        throw insertError;
      }
      console.log(`[${getNZTimestamp()}] ✅ Created new progress record`);
      return insertData ? insertData[0] : null;
    }
    
    console.log(`[${getNZTimestamp()}] 📌 Progress saved for later - contractor can resume`, { contractorId, inductionId });
    return data[0];
  } catch (error) {
    console.error(`[${getNZTimestamp()}] ❌ Error saving progress:`, error);
    throw error;
  }
}

/**
 * Complete an induction
 * @param {UUID} contractorId
 * @param {UUID} inductionId
 * @param {string} signatureText (optional)
 * @returns {Object} Completed progress record
 */
export async function completeInduction(contractorId, inductionId, signatureText = '') {
  try {
    const nowIso = new Date().toISOString();
    const completionPayload = {
      status: 'completed',
      signature_text: signatureText || '',
      completed_at: nowIso,
      updated_at: nowIso,
    };

    const { data: progressData, error: progressError } = await supabase
      .from('contractor_induction_progress')
      .update(completionPayload)
      .eq('contractor_id', contractorId)
      .eq('induction_id', inductionId)
      .select();

    if (progressError) throw progressError;

    let completedRecord = progressData?.[0] || null;
    if (!completedRecord) {
      const { data: insertData, error: insertError } = await supabase
        .from('contractor_induction_progress')
        .insert([{
          contractor_id: contractorId,
          induction_id: inductionId,
          started_at: nowIso,
          ...completionPayload,
        }])
        .select();

      if (insertError) {
        throw insertError;
      }
      completedRecord = insertData?.[0] || null;
    }

    try {
      const { data: induction, error: inductionError } = await supabase
        .from('inductions')
        .select('site_id')
        .eq('id', inductionId)
        .maybeSingle();

      if (!inductionError && induction?.site_id) {
        await syncSiteInductionRecordsFromProgress(contractorId);
      }
    } catch (syncError) {
      console.warn('Could not sync per-site induction after completion:', syncError.message);
    }

    console.log(`[${getNZTimestamp()}] ✅ Induction completed and signed`, { contractorId, inductionId });
    return completedRecord;
  } catch (error) {
    console.error(`[${getNZTimestamp()}] ❌ Error completing induction:`, error);
    throw error;
  }
}

/**
 * Get contractor's completed induction progress records.
 * @param {UUID} contractorId
 * @returns {Array} Completed induction data
 */
export async function getCompletedInductions(contractorId) {
  try {
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .select('induction_id, completed_at')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching completed inductions:', error);
    throw error;
  }
}

async function upsertCompletedInductionProgress(contractorId, inductionId, signatureText = 'Admin assigned') {
  const nowIso = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase
    .from('contractor_induction_progress')
    .select('id')
    .eq('contractor_id', contractorId)
    .eq('induction_id', inductionId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const payload = {
    status: 'completed',
    completed_at: nowIso,
    updated_at: nowIso,
    signature_text: signatureText,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('contractor_induction_progress')
      .update(payload)
      .eq('id', existing.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('contractor_induction_progress').insert({
    contractor_id: contractorId,
    induction_id: inductionId,
    started_at: nowIso,
    ...payload,
  });
  if (error) {
    throw error;
  }
}

async function markInductionCompletedForAdmin(contractorId, inductionId) {
  await upsertCompletedInductionProgress(contractorId, inductionId, 'Admin assigned');
}

async function postContractorCompletedInductionsApi(contractorId, inductionIds, mode = 'replace') {
  const response = await fetch('/api/contractor-completed-inductions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contractorId, inductionIds, mode }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to save contractor induction completions');
  }

  return response.json();
}

async function fetchCompletedInductionsByContractorApi() {
  const response = await fetch('/api/contractor-completed-inductions');
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to load contractor induction completions');
  }
  const payload = await response.json();
  return payload.completedByContractor || {};
}

export async function getCompletedInductionIdsForContractor(contractorId) {
  if (!contractorId) {
    return [];
  }

  const completedRows = await getCompletedInductions(contractorId);
  const completedIds = new Set(completedRows.map((row) => row.induction_id).filter(Boolean));

  const { data: siteRecords, error: siteRecordsError } = await supabase
    .from('contractor_inductions')
    .select('site_id, status, expires_at')
    .eq('contractor_id', contractorId);

  if (siteRecordsError) {
    throw siteRecordsError;
  }

  const activeSiteIds = (siteRecords || [])
    .filter((record) => {
      if (record.status === 'expired') {
        return false;
      }
      if (!record.expires_at) {
        return true;
      }
      return new Date(record.expires_at) >= new Date();
    })
    .map((record) => record.site_id)
    .filter(Boolean);

  if (activeSiteIds.length > 0) {
    const { data: siteInductions, error: siteInductionsError } = await supabase
      .from('inductions')
      .select('id, site_id')
      .in('site_id', activeSiteIds);

    if (siteInductionsError) {
      throw siteInductionsError;
    }

    for (const induction of siteInductions || []) {
      if (induction?.id) {
        completedIds.add(induction.id);
      }
    }
  }

  return [...completedIds];
}

export async function setContractorCompletedInductions(
  contractorId,
  inductionIds = [],
  { mode = 'replace' } = {}
) {
  if (!contractorId) {
    throw new Error('Contractor ID is required');
  }

  try {
    await postContractorCompletedInductionsApi(contractorId, inductionIds, mode);
    return [...new Set((inductionIds || []).filter(Boolean))];
  } catch (apiError) {
    console.warn('Admin induction API unavailable, falling back to client save:', apiError.message);
  }

  const uniqueTargetIds = [...new Set((inductionIds || []).filter(Boolean))];
  const existingRows = await getCompletedInductions(contractorId);
  const targetIds = new Set(uniqueTargetIds);

  for (const inductionId of uniqueTargetIds) {
    await markInductionCompletedForAdmin(contractorId, inductionId);
  }

  if (mode === 'replace') {
    for (const row of existingRows) {
      if (targetIds.has(row.induction_id)) {
        continue;
      }

      const { error } = await supabase
        .from('contractor_induction_progress')
        .delete()
        .eq('contractor_id', contractorId)
        .eq('induction_id', row.induction_id);

      if (error) {
        throw error;
      }
    }
  }

  if (uniqueTargetIds.length > 0) {
    const { data: inductionDetails, error: inductionError } = await supabase
      .from('inductions')
      .select('id, site_id')
      .in('id', uniqueTargetIds);

    if (inductionError) {
      throw inductionError;
    }

    const siteIds = [...new Set((inductionDetails || []).map((row) => row.site_id).filter(Boolean))];
    if (siteIds.length > 0) {
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('id, business_unit_id')
        .in('id', siteIds);

      if (sitesError) {
        throw sitesError;
      }

      const expiresAt = new Date(Date.now() + ONE_YEAR_MS).toISOString();
      for (const site of sites || []) {
        if (!site?.id || !site?.business_unit_id) {
          continue;
        }

        await upsertContractorSiteInduction({
          contractorId,
          siteId: site.id,
          businessUnitId: site.business_unit_id,
          expiresAt,
        });
      }
    }

    await syncSiteInductionRecordsFromProgress(contractorId);

    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('induction_expiry')
      .eq('id', contractorId)
      .maybeSingle();

    if (contractorError) {
      throw contractorError;
    }

    if (!contractor?.induction_expiry) {
      const expiryDate = new Date(Date.now() + ONE_YEAR_MS);
      const { error: expiryError } = await supabase
        .from('contractors')
        .update({ induction_expiry: expiryDate.toISOString().split('T')[0] })
        .eq('id', contractorId);

      if (expiryError) {
        throw expiryError;
      }
    }
  }

  return uniqueTargetIds;
}

/**
 * Get completed induction names grouped by contractor ID.
 * @returns {Object} Map of contractor_id -> induction name[]
 */
export async function getCompletedInductionsByContractor() {
  try {
    try {
      return await fetchCompletedInductionsByContractorApi();
    } catch (apiError) {
      console.warn('Admin induction API unavailable, falling back to client load:', apiError.message);
    }

    const progressRows = await fetchAllPaginated((from, to) =>
      supabase
        .from('contractor_induction_progress')
        .select('contractor_id, induction_id, completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(from, to)
    );

    const inductionIds = [...new Set((progressRows || []).map((row) => row.induction_id).filter(Boolean))];
    const inductionNameById = new Map();

    if (inductionIds.length > 0) {
      const inductions = await fetchAllBatchedByIds(inductionIds, (batch) =>
        supabase.from('inductions').select('id, induction_name').in('id', batch)
      );

      for (const induction of inductions || []) {
        inductionNameById.set(induction.id, formatInductionDisplayName(induction));
      }
    }

    const completedByContractor = {};
    for (const row of progressRows || []) {
      const inductionName = inductionNameById.get(row.induction_id);
      if (!row.contractor_id || !inductionName) {
        continue;
      }

      if (!completedByContractor[row.contractor_id]) {
        completedByContractor[row.contractor_id] = [];
      }

      if (!completedByContractor[row.contractor_id].includes(inductionName)) {
        completedByContractor[row.contractor_id].push(inductionName);
      }
    }

    const { data: siteRecords, error: siteRecordsError } = await supabase
      .from('contractor_inductions')
      .select('contractor_id, site_id, status, expires_at')
      .eq('status', 'completed');

    if (siteRecordsError) {
      throw siteRecordsError;
    }

    const activeSiteRecords = (siteRecords || []).filter((record) => {
      if (!record?.contractor_id || !record?.site_id) {
        return false;
      }
      if (record.expires_at && new Date(record.expires_at) < new Date()) {
        return false;
      }
      return true;
    });

    const activeSiteIds = [...new Set(activeSiteRecords.map((record) => record.site_id).filter(Boolean))];
    if (activeSiteIds.length > 0) {
      const [{ data: siteInductions, error: siteInductionsError }, { data: sites, error: sitesError }] =
        await Promise.all([
          supabase
            .from('inductions')
            .select('id, induction_name, site_id')
            .in('site_id', activeSiteIds),
          supabase
            .from('sites')
            .select('id, name')
            .in('id', activeSiteIds),
        ]);

      if (siteInductionsError) {
        throw siteInductionsError;
      }
      if (sitesError) {
        throw sitesError;
      }

      const siteIdToInductionName = new Map(
        (siteInductions || []).map((induction) => [induction.site_id, formatInductionDisplayName(induction)])
      );
      const siteIdToName = new Map((sites || []).map((site) => [site.id, site.name]));

      for (const record of activeSiteRecords) {
        const inductionName =
          siteIdToInductionName.get(record.site_id) ||
          (siteIdToName.get(record.site_id) ? `${siteIdToName.get(record.site_id)} Induction` : 'Site Induction');

        if (!completedByContractor[record.contractor_id]) {
          completedByContractor[record.contractor_id] = [];
        }

        if (!completedByContractor[record.contractor_id].includes(inductionName)) {
          completedByContractor[record.contractor_id].push(inductionName);
        }
      }
    }

    return completedByContractor;
  } catch (error) {
    console.error('Error fetching completed inductions by contractor:', error);
    throw error;
  }
}

/**
 * Get all contractors' induction completion data for a company
 * @param {UUID} companyId 
 * @returns {Array} Contractors with their induction completion status
 */
export async function getContractorInductionsForCompany(companyId) {
  try {
    // Get all services to map service_ids to names
    const { data: allServices, error: servicesError } = await supabase
      .from('services')
      .select('id, name');
    
    if (servicesError) throw servicesError;
    
    const serviceMap = {};
    if (allServices) {
      allServices.forEach(service => {
        serviceMap[service.id] = service.name;
      });
    }

    let contractors = [];
    if (getRequestingAdminId() || isAdminSessionActive()) {
      try {
        contractors = await contractorDataListByCompany(companyId);
      } catch (edgeError) {
        console.warn('getContractorInductionsForCompany edge failed, fallback:', edgeError?.message);
      }
    }
    if (!contractors?.length) {
      contractors = await fetchAllPaginated((from, to) =>
        supabase
          .from('contractors')
          .select('id, name, email, phone, service_ids, induction_expiry')
          .eq('company_id', companyId)
          .order('name', { ascending: true })
          .range(from, to),
      );
    }

    // For each contractor, get their completed inductions
    // Use safePromiseAll for better error handling - partial success even if some queries fail
    const inductionPromises = (contractors || []).map(async (contractor) => {
      const { data: inductions, error: inductionError } = await supabase
        .from('contractor_induction_progress')
        .select(`
          induction_id,
          status,
          completed_at,
          inductions(induction_name)
        `)
        .eq('contractor_id', contractor.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (inductionError) throw inductionError;

      // Map service_ids to service names
      const serviceNames = contractor.service_ids
        ? contractor.service_ids.map(id => serviceMap[id] || 'Unknown').filter(Boolean)
        : [];

      return {
        ...contractor,
        service_names: serviceNames,
        completedInductions: inductions || []
      };
    });

    const { succeeded, failed } = await safePromiseAll(
      inductionPromises,
      `loading inductions for ${contractors?.length || 0} contractors`
    );

    const contractorsWithInductions = succeeded.map(result => result.data);

    if (failed.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  Failed to load inductions for ${failed.length} contractors`);
    }

    return contractorsWithInductions || [];
  } catch (error) {
    console.error('Error fetching contractor inductions for company:', error);
    throw error;
  }
}

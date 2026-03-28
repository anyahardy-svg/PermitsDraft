/**
 * Inductions API - Simplified single-table schema
 * Handles induction management for contractor training
 */

import { supabase } from '../supabaseClient';

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

/**
 * Get all inductions
 * @returns {Array} All inductions
 */
export async function getAllInductions() {
  try {
    const { data, error } = await supabase
      .from('inductions')
      .select('*')
      .order('induction_name, subsection_name', { ascending: true });

    if (error) throw error;
    return data || [];
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
export async function getInductionsByBusinessUnit(businessUnitId, contractorServiceIds = []) {
  try {
    let query = supabase
      .from('inductions')
      .select('*')
      .overlaps('business_unit_ids', [businessUnitId]);

    // If contractor has services, filter to inductions that apply to those services
    if (contractorServiceIds && contractorServiceIds.length > 0) {
      // Induction applies if:
      // 1. It has no service_ids (applies to all) OR
      // 2. It has service_ids that overlap with contractor's services
      // Note: We fetch all and filter in JS because Supabase doesn't support complex OR conditions easily
    }

    const { data, error } = await query.order('induction_name, subsection_name', { ascending: true });

    if (error) throw error;
    
    // Filter by services in JavaScript (easier than complex SQL OR conditions)
    const filtered = data?.filter(induction => {
      // If induction has no service_ids, it applies to everyone
      if (!induction.service_ids || induction.service_ids.length === 0) {
        return true;
      }
      // If induction requires specific services, contractor must have at least one
      if (contractorServiceIds && contractorServiceIds.length > 0) {
        return induction.service_ids.some(serviceId => contractorServiceIds.includes(serviceId));
      }
      // Contractor has no services and induction requires services = don't show
      return false;
    }) || [];

    return filtered;
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
      .order('induction_name, subsection_name', { ascending: true });

    if (error) throw error;
    return data || [];
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

    const { data, error } = await query.order('induction_name, subsection_name', { ascending: true });

    if (error) throw error;
    return data || [];
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
    return data || [];
  } catch (error) {
    console.error('Error fetching compulsory inductions:', error);
    throw error;
  }
}

/**
 * Create a new induction
 * @param {Object} inductionData - { induction_name, description, subsection_name, business_unit_ids, site_id, service_id, video_url, video_duration, question_X_text, question_X_options, question_X_correct_answer, question_X_type, is_compulsory }
 * @returns {Object} Created induction
 */
export async function createInduction(inductionData) {
  try {
    const { data, error } = await supabase
      .from('inductions')
      .insert([{
        induction_name: inductionData.induction_name,
        description: inductionData.description || '',
        subsection_name: inductionData.subsection_name || '',
        business_unit_ids: inductionData.business_unit_ids || [],
        site_id: inductionData.site_id || null,
        service_id: inductionData.service_id || null,
        video_url: inductionData.video_url || '',
        video_duration: inductionData.video_duration ? parseInt(inductionData.video_duration) : 0,
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
      }])
      .select();

    if (error) throw error;
    return data ? data[0] : null;
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
    const updateData = {
      induction_name: updates.induction_name,
      description: updates.description || '',
      subsection_name: updates.subsection_name || '',
      business_unit_ids: updates.business_unit_ids || [],
      site_id: updates.site_id || null,
      service_id: updates.service_id || null,
      video_url: updates.video_url || '',
      video_duration: updates.video_duration ? parseInt(updates.video_duration) : 0,
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
    };

    const { data, error } = await supabase
      .from('inductions')
      .update(updateData)
      .eq('id', inductionId)
      .select();

    if (error) throw error;
    return data ? data[0] : null;
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
    const { error } = await supabase
      .from('inductions')
      .delete()
      .eq('id', inductionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting induction:', error);
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
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
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
 * @returns {Object} Progress record
 */
export async function startInduction(contractorId, inductionId) {
  try {
    // Check if already exists
    const existing = await getInductionProgress(contractorId, inductionId);
    if (existing) {
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
    // Update progress record status
    const { data: progressData, error: progressError } = await supabase
      .from('contractor_induction_progress')
      .update({
        status: 'completed',
        signature_text: signatureText || '',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('contractor_id', contractorId)
      .eq('induction_id', inductionId)
      .select();

    if (progressError) throw progressError;

    // Get the induction name to add as a service earned
    const { data: inductionData, error: inductionError } = await supabase
      .from('inductions')
      .select('induction_name, subsection_name')
      .eq('id', inductionId)
      .single();

    if (inductionError) throw inductionError;

    // Add induction as a service earned
    if (inductionData) {
      // Format: "Working at Heights - MEWP" or just "Working at Heights"
      const serviceName = inductionData.subsection_name
        ? `${inductionData.induction_name} - ${inductionData.subsection_name}`
        : inductionData.induction_name;

      const { data: contractorData } = await supabase
        .from('contractors')
        .select('service_ids')
        .eq('id', contractorId)
        .single();

      const currentServiceIds = contractorData?.service_ids || [];
      // Add as text service name (not UUID)
      if (!currentServiceIds.includes(serviceName)) {
        const updatedServiceIds = [...currentServiceIds, serviceName];
        await supabase
          .from('contractors')
          .update({ service_ids: updatedServiceIds })
          .eq('id', contractorId);
      }
    }

    console.log(`[${getNZTimestamp()}] ✅ Induction completed and signed`, { contractorId, inductionId, serviceName: inductionData?.induction_name });
    return progressData ? progressData[0] : null;
  } catch (error) {
    console.error(`[${getNZTimestamp()}] ❌ Error completing induction:`, error);
    throw error;
  }
}

/**
 * Get contractor's completed inductions (to check what services they have)
 * @param {UUID} contractorId
 * @returns {Array} Completed induction data
 */
export async function getCompletedInductions(contractorId) {
  try {
    const { data, error } = await supabase
      .from('contractor_induction_progress')
      .select('induction_id, completed_at, inductions(service_id)')
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

    // Get all contractors from the company
    const { data: contractors, error: contractorError } = await supabase
      .from('contractors')
      .select('id, name, email, service_ids, induction_expiry')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (contractorError) throw contractorError;

    // For each contractor, get their completed inductions
    const contractorsWithInductions = await Promise.all(
      (contractors || []).map(async (contractor) => {
        const { data: inductions, error: inductionError } = await supabase
          .from('contractor_induction_progress')
          .select(`
            induction_id,
            status,
            completed_at,
            inductions(induction_name, subsection_name)
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
      })
    );

    return contractorsWithInductions || [];
  } catch (error) {
    console.error('Error fetching contractor inductions for company:', error);
    throw error;
  }
}

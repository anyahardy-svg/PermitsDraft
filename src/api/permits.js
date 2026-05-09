import { supabase } from '../supabaseClient';

// Helper function to detect what changed between two permits
const detectChanges = (oldPermit, newPermit) => {
  const changes = [];
  
  if (!oldPermit || !newPermit) return changes;
  
  // Risk Level changes
  const oldRisk = oldPermit.jsea?.overallRiskRating || oldPermit.jsea?.riskRating || '';
  const newRisk = newPermit.jsea?.overallRiskRating || newPermit.jsea?.riskRating || '';
  if (oldRisk !== newRisk && (oldRisk || newRisk)) {
    changes.push(`Risk Level: ${oldRisk || 'none'}→${newRisk || 'none'}`);
  }
  
  // Contractor/Company changes
  const oldCompany = oldPermit.contractor_company || oldPermit.manual_company || '';
  const newCompany = newPermit.contractor_company || newPermit.manual_company || '';
  if (oldCompany !== newCompany && (oldCompany || newCompany)) {
    changes.push(`Contractor: ${oldCompany || 'none'}→${newCompany || 'none'}`);
  }
  
  // Isolations changes
  const oldIsolationCount = oldPermit.isolations?.length || 0;
  const newIsolationCount = newPermit.isolations?.length || 0;
  if (oldIsolationCount !== newIsolationCount) {
    changes.push(`Isolations: ${oldIsolationCount} items→${newIsolationCount} items`);
  }
  
  // Additional Precautions changes
  const oldPrecautions = oldPermit.jsea?.additionalPrecautions || '';
  const newPrecautions = newPermit.jsea?.additionalPrecautions || '';
  if (oldPrecautions !== newPrecautions && (oldPrecautions || newPrecautions)) {
    changes.push(`Precautions: Updated`);
  }
  
  // Permit Type changes
  if (oldPermit.permit_type !== newPermit.permit_type && (oldPermit.permit_type || newPermit.permit_type)) {
    changes.push(`Permit Type: ${oldPermit.permit_type || 'none'}→${newPermit.permit_type || 'none'}`);
  }
  
  // Priority changes
  if (oldPermit.priority !== newPermit.priority && (oldPermit.priority || newPermit.priority)) {
    changes.push(`Priority: ${oldPermit.priority || 'none'}→${newPermit.priority || 'none'}`);
  }
  
  return changes;
};

// Format changes as log entry similar to handovers
const createChangeLogEntry = (changes) => {
  if (!changes || changes.length === 0) return null;
  
  const now = new Date().toISOString();
  const timestamp = now.split('T')[0] + ' ' + now.split('T')[1].substring(0, 8);
  
  // Format: "Change1, Change2 (timestamp)"
  return `${changes.join(', ')} (${timestamp})`;
};

// Helper function to transform Supabase data to app format
const transformPermit = (dbPermit) => {
  return {
    id: dbPermit.id,
    permitNumber: dbPermit.permit_number,
    permit_number: dbPermit.permit_number,
    permit_type: dbPermit.permit_type,
    permitType: dbPermit.permit_type, // For backward compatibility
    description: dbPermit.description,
    location: dbPermit.location,
    status: dbPermit.status,
    priority: dbPermit.priority,
    startDate: dbPermit.start_date,
    start_date: dbPermit.start_date,
    startTime: dbPermit.start_time,
    start_time: dbPermit.start_time,
    endDate: dbPermit.end_date,
    end_date: dbPermit.end_date,
    endTime: dbPermit.end_time,
    end_time: dbPermit.end_time,
    requestedBy: dbPermit.requested_by,
    requested_by: dbPermit.requested_by,
    contractorCompany: dbPermit.contractor_company,
    contractor_company: dbPermit.contractor_company,
    manualCompany: dbPermit.manual_company,
    manual_company: dbPermit.manual_company,
    contractorSelected: dbPermit.contractor_selected || false,
    contractor_selected: dbPermit.contractor_selected || false,
    permittedIssuer: dbPermit.permitted_issuer,
    permitted_issuer: dbPermit.permitted_issuer,
    rejectionComment: dbPermit.rejection_comment,
    rejection_comment: dbPermit.rejection_comment,
    siteId: dbPermit.site_id,
    site_id: dbPermit.site_id,
    contractorId: dbPermit.contractor_id,
    contractor_id: dbPermit.contractor_id,
    controlsSummary: dbPermit.controls_summary,
    controls_summary: dbPermit.controls_summary,
    specializedPermits: dbPermit.specialized_permits || {},
    specialized_permits: dbPermit.specialized_permits || {},
    singleHazards: dbPermit.single_hazards || {},
    single_hazards: dbPermit.single_hazards || {},
    jsea: dbPermit.jsea || {},
    jseas: dbPermit.jseas || [],  // Handle case where jseas column doesn't exist yet
    isolations: dbPermit.isolations || [],
    signOns: dbPermit.sign_ons || {},
    sign_ons: dbPermit.sign_ons || {},
    inspected: dbPermit.inspected,
    completedSignOff: dbPermit.completed_sign_off,
    completed_sign_off: dbPermit.completed_sign_off,
    attachments: dbPermit.attachments || [],
    createdAt: dbPermit.created_at,
    created_at: dbPermit.created_at,
    submittedDate: dbPermit.created_at?.split('T')[0],
    lastVerifiedAt: dbPermit.last_verified_at,
    last_verified_at: dbPermit.last_verified_at,
    verifiedBy: dbPermit.verified_by,
    verified_by: dbPermit.verified_by,
    lastModifiedAt: dbPermit.last_modified_at,
    last_modified_at: dbPermit.last_modified_at,
    changesLog: dbPermit.permit_changes_log,
    permit_changes_log: dbPermit.permit_changes_log
  };
};

// Create a new permit
export const createPermit = async (permitData) => {
  try {
    console.log('📋 [API] Creating permit with data:', permitData);
    console.log('📋 [API] Data keys:', Object.keys(permitData));
    console.log('📋 [API] jsea field type:', typeof permitData.jsea, 'value:', permitData.jsea);
    console.log('📋 [API] jseas field type:', typeof permitData.jseas, 'value:', permitData.jseas);
    console.log('📋 [API] specializedPermits type:', typeof permitData.specialized_permits, 'value:', permitData.specialized_permits);
    console.log('📋 [API] singleHazards type:', typeof permitData.single_hazards, 'value:', permitData.single_hazards);
    
    // Log as JSON to see structure
    try {
      console.log('📋 [API] Permit data as JSON:', JSON.stringify(permitData, null, 2));
    } catch (e) {
      console.log('📋 [API] Could not stringify permit data:', e.message);
    }
    
    const { data, error } = await supabase
      .from('permits')
      .insert([permitData])
      .select();
    
    if (error) {
      console.error('❌ [API] Supabase error code:', error.code);
      console.error('❌ [API] Error message:', error.message);
      console.error('❌ [API] Error details:', error.details);
      console.error('❌ [API] Error hint:', error.hint);
      console.error('❌ [API] Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
    return transformPermit(data[0]);
  } catch (error) {
    console.error('❌ Error creating permit:', error);
    throw error;
  }
};

// Get a single permit by ID
export const getPermit = async (permitId) => {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('*')
      .eq('id', permitId)
      .single();
    
    if (error) throw error;
    return transformPermit(data);
  } catch (error) {
    console.error('Error fetching permit:', error);
    throw error;
  }
};

// Get all permits (with optional filters)
export const listPermits = async (filters = {}) => {
  try {
    let query = supabase.from('permits').select('*');
    
    if (filters.site_id) query = query.eq('site_id', filters.site_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.start_date) query = query.gte('start_date', filters.start_date);
    if (filters.end_date) query = query.lte('end_date', filters.end_date);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(transformPermit);
  } catch (error) {
    console.error('Error listing permits:', error);
    return [];
  }
};

// Update a permit
export const updatePermit = async (permitId, updates) => {
  try {
    // Fetch current permit to detect changes
    const { data: currentPermit, error: fetchError } = await supabase
      .from('permits')
      .select('*')
      .eq('id', permitId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Automatically add last_modified_at timestamp to all updates
    const updatesWithTimestamp = {
      ...updates,
      last_modified_at: new Date().toISOString()
    };
    
    // Detect what changed
    const newPermitData = { ...currentPermit, ...updates };
    const changes = detectChanges(currentPermit, newPermitData);
    
    // If there are changes, append to the change log
    if (changes.length > 0) {
      const newEntry = createChangeLogEntry(changes);
      const existingLog = currentPermit.permit_changes_log;
      
      updatesWithTimestamp.permit_changes_log = existingLog
        ? `${existingLog}, ${newEntry}`
        : newEntry;
      
      console.log('📝 [Permit Changes]', {
        permitId,
        changes,
        newEntry,
        updatedLog: updatesWithTimestamp.permit_changes_log
      });
    }
    
    const { data, error } = await supabase
      .from('permits')
      .update(updatesWithTimestamp)
      .eq('id', permitId)
      .select();
    
    if (error) throw error;
    return transformPermit(data[0]);
  } catch (error) {
    console.error('Error updating permit:', error);
    throw error;
  }
};

// Delete a permit
export const deletePermit = async (permitId) => {
  try {
    const { error } = await supabase
      .from('permits')
      .delete()
      .eq('id', permitId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting permit:', error);
    throw error;
  }
};

// Get permit questionnaires for a specific permit type
export const getPermitQuestionnaire = async (permitType) => {
  try {
    const { data, error } = await supabase
      .from('permit_questionnaires')
      .select('*')
      .eq('permit_type', permitType)
      .single();
    
    if (error) throw error;
    return data?.questions || {};
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return {};
  }
};

// Log an audit entry
export const logAuditEntry = async (permitId, action, userId, details) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        permit_id: permitId,
        action,
        user_id: userId,
        details
      }]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

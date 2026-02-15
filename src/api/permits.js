import { supabase } from '../supabaseClient';

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
    siteId: dbPermit.site_id,
    site_id: dbPermit.site_id,
    controlsSummary: dbPermit.controls_summary,
    controls_summary: dbPermit.controls_summary,
    specializedPermits: dbPermit.specialized_permits || {},
    specialized_permits: dbPermit.specialized_permits || {},
    singleHazards: dbPermit.single_hazards || {},
    single_hazards: dbPermit.single_hazards || {},
    jsea: dbPermit.jsea || {},
    isolations: dbPermit.isolations || [],
    signOns: dbPermit.sign_ons || {},
    sign_ons: dbPermit.sign_ons || {},
    inspected: dbPermit.inspected,
    completedSignOff: dbPermit.completed_sign_off,
    completed_sign_off: dbPermit.completed_sign_off,
    createdAt: dbPermit.created_at,
    created_at: dbPermit.created_at,
    submittedDate: dbPermit.created_at?.split('T')[0]
  };
};

// Create a new permit
export const createPermit = async (permitData) => {
  try {
    const { data, error } = await supabase
      .from('permits')
      .insert([permitData])
      .select();
    
    if (error) throw error;
    return transformPermit(data[0]);
  } catch (error) {
    console.error('Error creating permit:', error);
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
    const { data, error } = await supabase
      .from('permits')
      .update(updates)
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

/**
 * Templates API
 * Handles saving permits as templates and creating permits from templates
 */

import { supabase } from '../supabaseClient';

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Save completed permit as a template
 * @param {UUID} permitId - Original permit ID
 * @param {string} templateName - User-friendly name for template
 * @returns {Object} Template record
 */
export async function savePermitAsTemplate(permitId, templateName) {
  try {
    // Fetch the permit to copy its data
    const { data: permit, error: permitError } = await supabase
      .from('permits')
      .select('*')
      .eq('id', permitId)
      .single();

    if (permitError) throw permitError;

    // Create/update template record
    const { data, error } = await supabase
      .from('permits')
      .update({
        is_template: true,
        template_name: templateName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', permitId)
      .select()
      .single();

    if (error) throw error;

    await logAudit('template_saved', {
      original_permit_id: permitId,
      template_name: templateName,
      business_unit_id: permit.business_unit_id,
    });

    return {
      success: true,
      data,
      message: `Template "${templateName}" created from permit ${permit.id}`,
    };
  } catch (error) {
    console.error('Save template error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all templates for a business unit
 * @param {UUID} businessUnitId
 * @returns {Array} Template list
 */
export async function getTemplates(businessUnitId) {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('id, template_name, permit_type, location, business_unit_id, created_at, updated_at')
      .eq('is_template', true)
      .eq('business_unit_id', businessUnitId)
      .order('template_name', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get templates error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all templates (for admin/search)
 * @returns {Array} All templates across all business units
 */
export async function getAllTemplates() {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('*')
      .eq('is_template', true)
      .order('template_name', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get all templates error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get specific template by ID
 * @param {UUID} templateId
 * @returns {Object} Template details
 */
export async function getTemplate(templateId) {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('*')
      .eq('id', templateId)
      .eq('is_template', true)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get template error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete template
 * @param {UUID} templateId
 * @returns {boolean} Success
 */
export async function deleteTemplate(templateId) {
  try {
    // Fetch template to get details
    const { data: template } = await supabase
      .from('permits')
      .select('template_name')
      .eq('id', templateId)
      .single();

    // Delete the template permit
    const { error } = await supabase
      .from('permits')
      .update({
        is_template: false,
        template_name: null,
      })
      .eq('id', templateId);

    if (error) throw error;

    await logAudit('template_deleted', {
      template_id: templateId,
      template_name: template?.template_name,
    });

    return { success: true, message: 'Template deleted' };
  } catch (error) {
    console.error('Delete template error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CREATE PERMIT FROM TEMPLATE
// ============================================================================

/**
 * Create new permit by copying a template
 * Copies all permit data except IDs, timestamps, and status
 * @param {UUID} templateId - Template to copy from
 * @param {UUID} siteId - Target site
 * @param {UUID} businessUnitId - Target business unit
 * @param {Object} overrides - Any fields to override from template
 * @returns {Object} New permit record
 */
export async function createPermitFromTemplate(templateId, siteId, businessUnitId, overrides = {}) {
  try {
    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('permits')
      .select('*')
      .eq('id', templateId)
      .eq('is_template', true)
      .single();

    if (templateError) throw templateError;
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Prepare new permit data (copy template but clear status fields)
    const newPermit = {
      permit_type: template.permit_type,
      description: template.description,
      location: overrides.location || template.location,
      status: 'pending-approval', // Fresh permit starts in pending state
      priority: template.priority,
      start_date: overrides.start_date || template.start_date,
      start_time: overrides.start_time || template.start_time,
      end_date: overrides.end_date || template.end_date,
      end_time: overrides.end_time || template.end_time,
      requested_by: overrides.requested_by || template.requested_by,
      contractor_company: overrides.contractor_company || template.contractor_company,
      site_id: siteId,
      business_unit_id: businessUnitId,
      
      // Copy structured data
      controls_summary: template.controls_summary,
      specialized_permits: template.specialized_permits,
      single_hazards: template.single_hazards,
      jsea: template.jsea,
      
      // Status fields reset
      sign_ons: {},
      inspected: null,
      completed_sign_off: null,
      
      // Override any specific fields
      ...overrides,
    };

    // Create the new permit
    const { data, error } = await supabase
      .from('permits')
      .insert([newPermit])
      .select()
      .single();

    if (error) throw error;

    await logAudit('permit_created_from_template', {
      template_id: templateId,
      template_name: template.template_name,
      new_permit_id: data.id,
      site_id: siteId,
    });

    return {
      success: true,
      data,
      message: `Permit created from template "${template.template_name}"`,
    };
  } catch (error) {
    console.error('Create from template error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEMPLATE SUGGESTIONS
// ============================================================================

/**
 * Get templates by permit type (for quick access)
 * @param {string} permitType - Type of permit (e.g., 'Hot Work', 'Confined Space')
 * @returns {Array} Matching templates
 */
export async function getTemplatesByType(permitType) {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('id, template_name, business_unit_id, created_at')
      .eq('is_template', true)
      .eq('permit_type', permitType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get templates by type error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recently used templates
 * @param {UUID} businessUnitId
 * @param {number} limit - How many to return (default 5)
 * @returns {Array} Recently created/updated templates
 */
export async function getRecentTemplates(businessUnitId, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('id, template_name, permit_type, business_unit_id, updated_at')
      .eq('is_template', true)
      .eq('business_unit_id', businessUnitId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get recent templates error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEMPLATE ANALYTICS
// ============================================================================

/**
 * Get usage statistics for templates
 * How many times each template has been used to create permits
 * @param {UUID} businessUnitId
 * @returns {Array} Template usage stats
 */
export async function getTemplateUsageStats(businessUnitId) {
  try {
    // This requires a more complex query - getting permits created from templates
    // For now, return templates with metadata for potential future enhancement
    const { data: templates, error } = await supabase
      .from('permits')
      .select('id, template_name, created_at, updated_at')
      .eq('is_template', true)
      .eq('business_unit_id', businessUnitId)
      .order('template_name', { ascending: true });

    if (error) throw error;

    // Could enhance this by joining with permit creation audit logs
    return { success: true, data: templates };
  } catch (error) {
    console.error('Get template usage stats error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get most-used permit types (good candidates for templates)
 * @param {UUID} businessUnitId
 * @param {number} limit - Top how many
 * @returns {Array} Most common permit types
 */
export async function getMostUsedPermitTypes(businessUnitId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('permits')
      .select('permit_type')
      .eq('business_unit_id', businessUnitId)
      .eq('is_template', false); // Exclude templates themselves

    if (error) throw error;

    // Count by type
    const typeCounts = {};
    data.forEach((permit) => {
      typeCounts[permit.permit_type] = (typeCounts[permit.permit_type] || 0) + 1;
    });

    // Sort by count
    const sorted = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type, count]) => ({
        permit_type: type,
        usage_count: count,
      }));

    return { success: true, data: sorted };
  } catch (error) {
    console.error('Get most used permit types error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log audit trail
 */
async function logAudit(action, details) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export default {
  savePermitAsTemplate,
  getTemplates,
  getAllTemplates,
  getTemplate,
  deleteTemplate,
  createPermitFromTemplate,
  getTemplatesByType,
  getRecentTemplates,
  getTemplateUsageStats,
  getMostUsedPermitTypes,
};

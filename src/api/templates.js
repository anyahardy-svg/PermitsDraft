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
 * @param {UUID} permitId - Original permit ID to extract data from
 * @param {string} templateName - User-friendly name for template
 * @param {UUID} businessUnitId - Business unit for the template
 * @param {string} companyName - Company name for the template (optional)
 * @param {string} createdBy - User who created the template (optional)
 * @returns {Object} Template record
 */
export async function savePermitAsTemplate(permitId, templateName, businessUnitId, companyName = null, createdBy = null) {
  try {
    // Fetch the permit to extract template data
    const { data: permit, error: permitError } = await supabase
      .from('permits')
      .select('specialized_permits, single_hazards, jsea, completion, contractor_company')
      .eq('id', permitId)
      .single();

    if (permitError) throw permitError;

    // Use provided company name or fall back to permit's contractor company
    const templateCompanyName = companyName || permit.contractor_company || null;

    // Create template record with only the reusable permit components
    const { data, error } = await supabase
      .from('permit_templates')
      .insert({
        template_name: templateName,
        business_unit_id: businessUnitId,
        company_name: templateCompanyName,
        specialized_permits: permit.specialized_permits || {},
        single_hazards: permit.single_hazards || {},
        jsea: permit.jsea || {},
        completion: permit.completion || null,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message: `Template "${templateName}" created successfully`,
    };
  } catch (error) {
    console.error('Save permit template error:', error);
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
      .from('permit_templates')
      .select('id, template_name, company_name, description, specialized_permits, single_hazards, jsea, business_unit_id, created_at, updated_at, created_by')
      .eq('business_unit_id', businessUnitId)
      .order('template_name', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get permit templates error:', error);
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
      .from('permit_templates')
      .select('*')
      .order('template_name', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get all permit templates error:', error);
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
      .from('permit_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get permit template error:', error);
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
    // Fetch template to get details for audit
    const { data: template } = await supabase
      .from('permit_templates')
      .select('template_name')
      .eq('id', templateId)
      .single();

    // Delete the template
    const { error } = await supabase
      .from('permit_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    return { success: true, message: 'Template deleted successfully' };
  } catch (error) {
    console.error('Delete permit template error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// JSEA TEMPLATES
// ============================================================================

/**
 * Save JSEA as a reusable template
 * @param {string} jseaName - Name for this JSEA template
 * @param {Array} jseaSteps - Array of step objects {description, hazards, controls}
 * @param {UUID} businessUnitId - Business unit this template belongs to
 * @param {UUID} companyId - Company ID to associate with the template
 * @returns {Object} Saved JSEA template
 */
export async function saveJseaTemplate(jseaName, jseaSteps, businessUnitIds, companyId = null, siteIds = []) {
  try {
    // Save JSEA template to templates table with business unit IDs and site IDs in data
    const { data, error } = await supabase
      .from('templates')
      .insert([{
        name: jseaName,
        template_type: 'jsea',
        company_id: companyId,
        data: {
          steps: jseaSteps,
          business_unit_ids: businessUnitIds || [],
          site_ids: siteIds || [],
        },
      }])
      .select()
      .single();

    if (error) throw error;

    // Also add template to selected business unit(s) in junction table for efficient querying
    if (businessUnitIds && businessUnitIds.length > 0) {
      const businessUnitEntries = businessUnitIds.map(buId => ({
        template_id: data.id,
        business_unit_id: buId,
      }));

      const { error: juError } = await supabase
        .from('template_business_units')
        .insert(businessUnitEntries);

      if (juError) throw juError;
    }

    await logAudit('jsea_template_saved', {
      template_id: data.id,
      template_name: jseaName,
      business_unit_ids: businessUnitIds,
      site_ids: siteIds,
      company_id: companyId,
      step_count: jseaSteps.length,
    });

    return { success: true, data, message: `JSEA template "${jseaName}" saved` };
  } catch (error) {
    console.error('Save JSEA template error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all JSEA templates for a business unit
 * @param {UUID} businessUnitId
 * @returns {Array} JSEA templates
 */
export async function getJseaTemplates(businessUnitId) {
  try {
    // Get all JSEA templates that either:
    // 1. Have an entry in template_business_units for this BU, OR
    // 2. Have NO entries in template_business_units (available to all BUs)
    const { data: allTemplates, error: listError } = await supabase
      .from('templates')
      .select('id, name, data, company_id, created_at, updated_at')
      .eq('template_type', 'jsea')
      .order('name', { ascending: true });

    if (listError) throw listError;

    // Get templates specifically assigned to this business unit
    const { data: assignedToThisBU, error: buError } = await supabase
      .from('template_business_units')
      .select('template_id')
      .eq('business_unit_id', businessUnitId);

    if (buError) throw buError;

    const assignedIds = new Set(assignedToThisBU?.map(row => row.template_id) || []);

    // Get templates assigned to any business unit
    const { data: templatesWithBU, error: anyBUError } = await supabase
      .from('template_business_units')
      .select('template_id');

    if (anyBUError) throw anyBUError;

    const templatesWithBUIds = new Set(templatesWithBU?.map(row => row.template_id) || []);

    // Filter templates: include if assigned to this BU, or if not assigned to any BU (available to all)
    const filteredTemplates = allTemplates.filter(template => 
      assignedIds.has(template.id) || !templatesWithBUIds.has(template.id)
    );

    // Transform data for easier access
    const transformedData = filteredTemplates.map(template => ({
      id: template.id,
      template_name: template.name,
      name: template.name,
      jsea: template.data?.steps || [],
      company_id: template.company_id,
      business_unit_ids: template.data?.business_unit_ids || [],
      site_ids: template.data?.site_ids || [],
      business_unit_id: businessUnitId,
      created_at: template.created_at,
      updated_at: template.updated_at,
    }));

    return { success: true, data: transformedData };
  } catch (error) {
    console.error('Get JSEA templates error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all JSEA templates for a specific company
 * @param {UUID} companyId
 * @returns {Array} JSEA templates for company
 */
export async function getJseaTemplatesByCompany(companyId) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('id, name, data, company_id, created_at, updated_at')
      .eq('template_type', 'jsea')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) throw error;

    // Get business units for each template
    const templatesWithBU = await Promise.all(
      data.map(async (template) => {
        const { data: buData } = await supabase
          .from('template_business_units')
          .select('business_unit_id')
          .eq('template_id', template.id);
        
        return {
          id: template.id,
          template_name: template.name,
          name: template.name,
          jsea: template.data?.steps || [],
          company_id: template.company_id,
          business_unit_ids: template.data?.business_unit_ids || [],
          site_ids: template.data?.site_ids || [],
          business_units: buData?.map(row => row.business_unit_id) || [],
          created_at: template.created_at,
          updated_at: template.updated_at,
        };
      })
    );

    return { success: true, data: templatesWithBU };
  } catch (error) {
    console.error('Get JSEA templates by company error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get specific JSEA template by ID
 * @param {UUID} jseaTemplateId
 * @returns {Object} JSEA template with steps
 */
export async function getJseaTemplate(jseaTemplateId) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('id, name, data, company_id, created_at, updated_at')
      .eq('template_type', 'jsea')
      .eq('id', jseaTemplateId)
      .single();

    if (error) throw error;

    // Get business units this template is assigned to
    const { data: buData } = await supabase
      .from('template_business_units')
      .select('business_unit_id')
      .eq('template_id', jseaTemplateId);

    // Transform data for compatibility
    const transformedData = {
      id: data.id,
      template_name: data.name,
      name: data.name,
      jsea: data.data?.steps || [],
      company_id: data.company_id,
      business_unit_ids: data.data?.business_unit_ids || [],
      site_ids: data.data?.site_ids || [],
      business_units: buData?.map(row => row.business_unit_id) || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { success: true, data: transformedData };
  } catch (error) {
    console.error('Get JSEA template error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete JSEA template
 * @param {UUID} jseaTemplateId
 * @returns {boolean} Success
 */
export async function deleteJseaTemplate(jseaTemplateId) {
  try {
    const { data: template } = await supabase
      .from('templates')
      .select('name')
      .eq('id', jseaTemplateId)
      .eq('template_type', 'jsea')
      .single();

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', jseaTemplateId)
      .eq('template_type', 'jsea');

    if (error) throw error;

    await logAudit('jsea_template_deleted', {
      template_id: jseaTemplateId,
      template_name: template?.name,
    });

    return { success: true, message: 'JSEA template deleted' };
  } catch (error) {
    console.error('Delete JSEA template error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update JSEA template
 * @param {UUID} jseaTemplateId
 * @param {string} jseaName - Updated name
 * @param {Array} jseaSteps - Updated steps
 * @returns {Object} Updated template
 */
export async function updateJseaTemplate(jseaTemplateId, jseaName, jseaSteps) {
  try {
    // Get existing template to preserve business_unit_ids and site_ids
    const { data: existingTemplate } = await supabase
      .from('templates')
      .select('data')
      .eq('id', jseaTemplateId)
      .eq('template_type', 'jsea')
      .single();

    const { data, error } = await supabase
      .from('templates')
      .update({
        name: jseaName,
        data: {
          steps: jseaSteps,
          business_unit_ids: existingTemplate?.data?.business_unit_ids || [],
          site_ids: existingTemplate?.data?.site_ids || [],
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jseaTemplateId)
      .eq('template_type', 'jsea')
      .select()
      .single();

    if (error) throw error;

    // Get business units this template is assigned to
    const { data: buData } = await supabase
      .from('template_business_units')
      .select('business_unit_id')
      .eq('template_id', jseaTemplateId);

    // Transform data for compatibility
    const transformedData = {
      id: data.id,
      template_name: data.name,
      name: data.name,
      jsea: data.data?.steps || [],
      company_id: data.company_id,
      business_units: buData?.map(row => row.business_unit_id) || [],
      site_ids: data.data?.site_ids || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    await logAudit('jsea_template_updated', {
      template_id: jseaTemplateId,
      template_name: jseaName,
      step_count: jseaSteps.length,
    });

    return { success: true, data: transformedData, message: `JSEA template "${jseaName}" updated` };
  } catch (error) {
    console.error('Update JSEA template error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PERMIT TEMPLATES

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

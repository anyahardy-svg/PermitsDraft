/**
 * Inductions API
 * Handles contractor induction workflows and tracking
 */

import { supabase } from '../supabaseClient';

// ============================================================================
// INDUCTION WORKFLOW
// ============================================================================

/**
 * Start contractor induction for a site
 * @param {UUID} contractorId
 * @param {UUID} siteId
 * @param {UUID} businessUnitId
 * @returns {Object} Induction modules for this site
 */
export async function startInduction(contractorId, siteId, businessUnitId) {
  try {
    // Get all induction modules for this site (in order)
    const { data: modules, error: modulesError } = await supabase
      .from('induction_modules')
      .select('*')
      .eq('site_id', siteId)
      .order('order_number', { ascending: true });

    if (modulesError) throw modulesError;

    // Check if contractor is already inducted
    const { data: existing } = await supabase
      .from('contractor_inductions')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('site_id', siteId)
      .single();

    if (existing && existing.status === 'completed' && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
      return {
        success: false,
        error: 'Contractor already inducted at this site',
        alreadyInducted: true,
      };
    }

    return {
      success: true,
      data: {
        modules,
        contractorId,
        siteId,
        businessUnitId,
        totalModules: modules.length,
      },
    };
  } catch (error) {
    console.error('Start induction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete contractor induction
 * @param {UUID} contractorId
 * @param {UUID} siteId
 * @param {UUID} businessUnitId
 * @param {string} signatureUrl - URL to signature image in storage
 * @param {UUID} inductedByUserId - Optional: user who inducted them
 * @returns {Object} Completed induction record
 */
export async function completeInduction(
  contractorId,
  siteId,
  businessUnitId,
  signatureUrl = null,
  inductedByUserId = null
) {
  try {
    // Calculate expiry date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Check if this is a new induction or a renewal
    const { data: existing } = await supabase
      .from('contractor_inductions')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('site_id', siteId)
      .single();

    let result;
    if (existing) {
      // Update existing induction (renewal)
      const { data, error } = await supabase
        .from('contractor_inductions')
        .update({
          inducted_at: new Date().toISOString(),
          induced_by_user_id: inductedByUserId,
          expires_at: expiresAt.toISOString(),
          status: 'completed',
          acknowledgment_signature_url: signatureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new induction
      const { data, error } = await supabase
        .from('contractor_inductions')
        .insert({
          contractor_id: contractorId,
          site_id: siteId,
          business_unit_id: businessUnitId,
          inducted_at: new Date().toISOString(),
          inducted_by_user_id: inductedByUserId,
          expires_at: expiresAt.toISOString(),
          status: 'completed',
          acknowledgment_signature_url: signatureUrl,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Update sign_ins if there's an active check-in for this contractor at this site
    await supabase
      .from('sign_ins')
      .update({
        inducted: true,
        induction_status: 'inducted',
        inducted_at_site: result.inducted_at,
      })
      .eq('contractor_id', contractorId)
      .eq('site_id', siteId)
      .is('check_out_time', null); // Only active sign-ins

    // Log audit
    await logAudit('induction_completed', {
      contractor_id: contractorId,
      site_id: siteId,
      expires_at: expiresAt.toISOString(),
      renewed: !!existing,
    });

    return {
      success: true,
      data: result,
      message: existing ? 'Induction renewed' : 'Induction completed',
    };
  } catch (error) {
    console.error('Complete induction error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INDUCTION STATUS
// ============================================================================

/**
 * Get contractor's induction status at a specific site
 * @param {UUID} contractorId
 * @param {UUID} siteId
 * @returns {Object} Induction status
 */
export async function getInductionStatus(contractorId, siteId) {
  try {
    const { data, error } = await supabase
      .from('contractor_inductions')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('site_id', siteId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No induction record found
      return {
        success: true,
        data: {
          status: 'not_inducted',
          message: 'Induction required',
        },
      };
    }

    if (error) throw error;

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return {
        success: true,
        data: {
          ...data,
          status: 'expired',
          message: 'Induction expired - renewal required',
          expiresOn: new Date(data.expires_at).toLocaleDateString(),
        },
      };
    }

    // Check if expiring soon (within 14 days)
    const daysUntilExpiry = Math.round(
      (new Date(data.expires_at) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 14) {
      return {
        success: true,
        data: {
          ...data,
          status: 'expiring_soon',
          message: `Induction expires in ${daysUntilExpiry} days`,
          daysUntilExpiry,
        },
      };
    }

    return {
      success: true,
      data: {
        ...data,
        status: 'valid',
        message: 'Induction current',
        daysUntilExpiry,
      },
    };
  } catch (error) {
    console.error('Get induction status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all contractors at a site with their induction status
 * @param {UUID} siteId
 * @returns {Array} Contractors with induction status
 */
export async function getContractorInductionStatus(siteId) {
  try {
    const { data, error } = await supabase
      .from('contractor_inductions')
      .select(`
        id,
        contractor_id,
        inducted_at,
        expires_at,
        status
      `)
      .eq('site_id', siteId);

    if (error) throw error;

    // Enrich with contractor names
    const enriched = await Promise.all(
      data.map(async (induction) => {
        const { data: contractor } = await supabase
          .from('contractors')
          .select('name, company_id')
          .eq('id', induction.contractor_id)
          .single();

        const { data: company } = contractor?.company_id
          ? await supabase.from('companies').select('name').eq('id', contractor.company_id).single()
          : { data: null };

        // Determine status
        let status = induction.status;
        if (induction.expires_at && new Date(induction.expires_at) < new Date()) {
          status = 'expired';
        } else if (induction.expires_at) {
          const daysUntilExpiry = Math.round(
            (new Date(induction.expires_at) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry < 14) {
            status = 'expiring_soon';
          }
        }

        return {
          ...induction,
          contractor_name: contractor?.name,
          company_name: company?.name,
          status,
          expires_on: induction.expires_at ? new Date(induction.expires_at).toLocaleDateString() : null,
        };
      })
    );

    return { success: true, data: enriched };
  } catch (error) {
    console.error('Get contractor induction status error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INDUCTION MODULES (Admin)
// ============================================================================

/**
 * Get all induction modules for a site
 * @param {UUID} siteId
 * @returns {Array} Induction modules
 */
export async function getInductionModules(siteId) {
  try {
    const { data, error } = await supabase
      .from('induction_modules')
      .select('*')
      .eq('site_id', siteId)
      .order('order_number', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get induction modules error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create induction module
 * @param {UUID} siteId
 * @param {UUID} businessUnitId
 * @param {Object} module - { title, content, contentType, durationMinutes, orderNumber }
 * @returns {Object} Created module
 */
export async function createInductionModule(siteId, businessUnitId, module) {
  try {
    const { data, error } = await supabase
      .from('induction_modules')
      .insert({
        site_id: siteId,
        business_unit_id: businessUnitId,
        title: module.title,
        description: module.description || '',
        content_type: module.contentType || 'html',
        content: module.content,
        duration_minutes: module.durationMinutes || 30,
        order_number: module.orderNumber || 0,
        requires_signature: module.requiresSignature !== false, // Default true
      })
      .select()
      .single();

    if (error) throw error;

    await logAudit('induction_module_created', {
      site_id: siteId,
      title: module.title,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Create induction module error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update induction module
 */
export async function updateInductionModule(moduleId, updates) {
  try {
    const { data, error } = await supabase
      .from('induction_modules')
      .update({
        title: updates.title,
        description: updates.description,
        content_type: updates.contentType,
        content: updates.content,
        duration_minutes: updates.durationMinutes,
        order_number: updates.orderNumber,
        requires_signature: updates.requiresSignature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', moduleId)
      .select()
      .single();

    if (error) throw error;

    await logAudit('induction_module_updated', { module_id: moduleId });

    return { success: true, data };
  } catch (error) {
    console.error('Update induction module error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete induction module
 */
export async function deleteInductionModule(moduleId) {
  try {
    const { error } = await supabase.from('induction_modules').delete().eq('id', moduleId);

    if (error) throw error;

    await logAudit('induction_module_deleted', { module_id: moduleId });

    return { success: true };
  } catch (error) {
    console.error('Delete induction module error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// NOTIFICATIONS (For expiring inductions)
// ============================================================================

/**
 * Check for inductions expiring soon and trigger notifications
 * This should be called daily by a scheduled job
 */
export async function notifyExpiringInductions() {
  try {
    // Find inductions expiring in next 14 days
    const inFourteenDays = new Date();
    inFourteenDays.setDate(inFourteenDays.getDate() + 14);

    const { data: expiring, error } = await supabase
      .from('contractor_inductions')
      .select(`
        id,
        contractor_id,
        site_id,
        expires_at
      `)
      .lt('expires_at', inFourteenDays.toISOString())
      .gt('expires_at', new Date().toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    // Log notification event (actual email/SMS sent would happen in Supabase functions or external service)
    if (expiring.length > 0) {
      await logAudit('inductions_expiring_notification', {
        count: expiring.length,
        expiring_ids: expiring.map((e) => e.id),
      });
    }

    return {
      success: true,
      data: expiring,
      message: `${expiring.length} inductions expiring soon`,
    };
  } catch (error) {
    console.error('Notify expiring inductions error:', error);
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
  startInduction,
  completeInduction,
  getInductionStatus,
  getContractorInductionStatus,
  getInductionModules,
  createInductionModule,
  updateInductionModule,
  deleteInductionModule,
  notifyExpiringInductions,
};

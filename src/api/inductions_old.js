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
// NEW COMPREHENSIVE INDUCTION SYSTEM
// ============================================================================

/**
 * Get all inductions (compulsory + optional) for a contractor
 * Based on their business units and selected sites
 * @param {UUID} contractorId
 * @param {Array<UUID>} businessUnitIds - Business units contractor works for
 * @param {Array<UUID>} siteIds - Sites contractor works for
 * @returns {Object} { compulsory: [...], optional: [...] }
 */
export async function getInductionsForContractor(contractorId, businessUnitIds, siteIds) {
  try {
    if (!businessUnitIds || businessUnitIds.length === 0) {
      return { success: true, data: { compulsory: [], optional: [] } };
    }

    // Get all induction sections for contractor's BUs (site-specific or ALL sites)
    const { data: sections, error: sectionsError } = await supabase
      .from('induction_sections')
      .select('*')
      .in('business_unit_id', businessUnitIds)
      .or(`site_id.is.null,site_id.in.(${siteIds.join(',')})`)
      .order('order_number', { ascending: true });

    if (sectionsError) throw sectionsError;

    // Separate compulsory vs optional
    const compulsory = sections.filter(s => s.is_compulsory);
    const optional = sections.filter(s => !s.is_compulsory);

    // Get contractor's progress for each section
    const { data: progress } = await supabase
      .from('contractor_induction_progress')
      .select('induction_section_id, status')
      .eq('contractor_id', contractorId);

    const progressMap = {};
    (progress || []).forEach(p => {
      progressMap[p.induction_section_id] = p.status;
    });

    // Enrich sections with progress
    const enriched = (sections) => sections.map(s => ({
      ...s,
      progress: progressMap[s.id] || 'not_started',
    }));

    return {
      success: true,
      data: {
        compulsory: enriched(compulsory),
        optional: enriched(optional),
      },
    };
  } catch (error) {
    console.error('Get inductions for contractor error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get subsections for an induction section
 * @param {UUID} sectionId
 * @returns {Array} Subsections with video URLs
 */
export async function getInductionSubsections(sectionId) {
  try {
    const { data: subsections, error } = await supabase
      .from('induction_subsections')
      .select('*')
      .eq('induction_section_id', sectionId)
      .order('order_number', { ascending: true });

    if (error) throw error;

    return { success: true, data: subsections };
  } catch (error) {
    console.error('Get induction subsections error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get questions for an induction subsection
 * @param {UUID} subsectionId
 * @returns {Array} Questions (without answers/correct_answer)
 */
export async function getInductionQuestions(subsectionId) {
  try {
    const { data: questions, error } = await supabase
      .from('induction_questions')
      .select('id, question_number, question_text, question_type, options')
      .eq('induction_subsection_id', subsectionId)
      .order('question_number', { ascending: true });

    if (error) throw error;

    return { success: true, data: questions };
  } catch (error) {
    console.error('Get induction questions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save contractor's progress on a subsection
 * Called when contractor submits answers to questions
 * @param {UUID} contractorId
 * @param {UUID} siteId
 * @param {UUID} businessUnitId
 * @param {UUID} subsectionId
 * @param {Object} answers - { q1: 'a', q2: 'b', q3: 'c' }
 * @returns {Object} Score and completion status
 */
export async function saveInductionProgress(
  contractorId,
  siteId,
  businessUnitId,
  subsectionId,
  answers
) {
  try {
    // Get section info
    const { data: subsection, error: subError } = await supabase
      .from('induction_subsections')
      .select('induction_section_id')
      .eq('id', subsectionId)
      .single();

    if (subError) throw subError;

    const sectionId = subsection.induction_section_id;

    // Get all questions to verify answers
    const { data: questions, error: questionsError } = await supabase
      .from('induction_questions')
      .select('id, question_number, correct_answer')
      .eq('induction_subsection_id', subsectionId);

    if (questionsError) throw questionsError;

    // Calculate score
    let score = 0;
    questions.forEach(q => {
      const answerKey = `q${q.question_number}`;
      if (answers[answerKey] === q.correct_answer) {
        score++;
      }
    });

    // Check if progress record exists
    const { data: existing } = await supabase
      .from('contractor_induction_progress')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('induction_subsection_id', subsectionId)
      .eq('business_unit_id', businessUnitId)
      .single();

    // Upsert progress record
    const progressData = {
      contractor_id: contractorId,
      site_id: siteId,
      business_unit_id: businessUnitId,
      induction_section_id: sectionId,
      induction_subsection_id: subsectionId,
      status: 'questions_answered',
      answers_submitted: answers,
      questions_score: score,
      answered_at: new Date().toISOString(),
    };

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('contractor_induction_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return { success: true, data: updated, score };
    } else {
      const { data: created, error: createError } = await supabase
        .from('contractor_induction_progress')
        .insert(progressData)
        .select()
        .single();

      if (createError) throw createError;
      return { success: true, data: created, score };
    }
  } catch (error) {
    console.error('Save induction progress error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete an induction subsection (with signature)
 * Auto-adds service if all subsections in section are completed
 * @param {UUID} contractorId
 * @param {UUID} siteId
 * @param {UUID} businessUnitId
 * @param {UUID} subsectionId
 * @param {string} signatureUrl - URL to signature image
 * @returns {Object} Completion record with service info (if added)
 */
export async function completeInductionSubsection(
  contractorId,
  siteId,
  businessUnitId,
  subsectionId,
  signatureUrl
) {
  try {
    // Get subsection and section info
    const { data: subsection, error: subError } = await supabase
      .from('induction_subsections')
      .select('*, induction_section_id')
      .eq('id', subsectionId)
      .single();

    if (subError) throw subError;

    const sectionId = subsection.induction_section_id;

    // Update progress record with signature and completion
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { data: completed, error: completeError } = await supabase
      .from('contractor_induction_progress')
      .update({
        status: 'completed',
        signature_url: signatureUrl,
        completed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('contractor_id', contractorId)
      .eq('induction_subsection_id', subsectionId)
      .eq('business_unit_id', businessUnitId)
      .select()
      .single();

    if (completeError) throw completeError;

    // Check if ALL subsections in this section are completed
    const { data: allSubsections } = await supabase
      .from('induction_subsections')
      .select('id')
      .eq('induction_section_id', sectionId);

    const { data: completedSubsections } = await supabase
      .from('contractor_induction_progress')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('induction_section_id', sectionId)
      .eq('status', 'completed');

    let serviceAdded = false;
    let serviceData = null;

    // If all subsections completed, add service to contractor
    if (allSubsections && completedSubsections && 
        completedSubsections.length === allSubsections.length) {
      
      const { data: section } = await supabase
        .from('induction_sections')
        .select('service_id')
        .eq('id', sectionId)
        .single();

      if (section && section.service_id) {
        // Get contractor's current service_ids
        const { data: contractor } = await supabase
          .from('contractors')
          .select('service_ids')
          .eq('id', contractorId)
          .single();

        const currentServiceIds = contractor?.service_ids || [];
        
        // Add service if not already there
        if (!currentServiceIds.includes(section.service_id)) {
          const updatedServiceIds = [...currentServiceIds, section.service_id];
          
          const { data: updated, error: updateError } = await supabase
            .from('contractors')
            .update({
              service_ids: updatedServiceIds,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contractorId)
            .select()
            .single();

          if (!updateError) {
            serviceAdded = true;
            serviceData = {
              serviceId: section.service_id,
              sections: allSubsections.length,
              allCompleted: true,
            };

            // Update the progress record to track service addition
            await supabase
              .from('contractor_induction_progress')
              .update({ service_added_at: new Date().toISOString() })
              .eq('contractor_id', contractorId)
              .eq('induction_section_id', sectionId);
          }
        }
      }
    }

    return {
      success: true,
      data: completed,
      serviceAdded,
      serviceData,
    };
  } catch (error) {
    console.error('Complete induction subsection error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin: Create induction section with subsections and questions
 * @param {Object} template - {
 *   businessUnitId, siteId (optional), inductionName, serviceId,
 *   subsections: [{ name, videoUrl, videoDuration, questions: [{text, type, options, correctAnswer}] }]
 * }
 * @returns {Object} Created section with all relationships
 */
export async function createInductionTemplate(template) {
  try {
    const {
      businessUnitId,
      siteId = null,
      inductionName,
      description = '',
      isCompulsory = true,
      serviceId = null,
      orderNumber = 0,
      subsections = [],
    } = template;

    // Create section
    const { data: section, error: sectionError } = await supabase
      .from('induction_sections')
      .insert({
        business_unit_id: businessUnitId,
        site_id: siteId,
        induction_name: inductionName,
        description,
        is_compulsory: isCompulsory,
        service_id: serviceId,
        order_number: orderNumber,
      })
      .select()
      .single();

    if (sectionError) throw sectionError;

    const createdSubsections = [];

    // Create subsections and questions
    for (let i = 0; i < subsections.length; i++) {
      const sub = subsections[i];

      const { data: subsection, error: subError } = await supabase
        .from('induction_subsections')
        .insert({
          induction_section_id: section.id,
          subsection_name: sub.name,
          description: sub.description || '',
          video_url: sub.videoUrl,
          video_duration_minutes: sub.videoDuration || 15,
          is_default: sub.isDefault !== false && i === 0, // First subsection is default
          order_number: i,
        })
        .select()
        .single();

      if (subError) throw subError;

      // Create questions
      const createdQuestions = [];
      for (let j = 0; j < (sub.questions || []).length; j++) {
        const question = sub.questions[j];

        const { data: questionRecord, error: qError } = await supabase
          .from('induction_questions')
          .insert({
            induction_subsection_id: subsection.id,
            question_number: j + 1,
            question_text: question.text,
            question_type: question.type || 'multiple-choice',
            options: question.options || {},
            correct_answer: question.correctAnswer || 'a',
          })
          .select()
          .single();

        if (qError) throw qError;
        createdQuestions.push(questionRecord);
      }

      createdSubsections.push({
        ...subsection,
        questions: createdQuestions,
      });
    }

    await logAudit('induction_template_created', {
      section_id: section.id,
      induction_name: inductionName,
      subsections_count: createdSubsections.length,
    });

    return {
      success: true,
      data: {
        ...section,
        subsections: createdSubsections,
      },
    };
  } catch (error) {
    console.error('Create induction template error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin: Get all induction templates for a business unit
 * @param {UUID} businessUnitId
 * @param {UUID} siteId (optional) - Filter by site
 * @returns {Array} Induction sections with subsections
 */
export async function getInductionTemplates(businessUnitId, siteId = null) {
  try {
    let query = supabase
      .from('induction_sections')
      .select('*')
      .eq('business_unit_id', businessUnitId);

    if (siteId) {
      query = query.or(`site_id.eq.${siteId},site_id.is.null`);
    }

    const { data: sections, error: sectionsError } = await query.order('order_number');

    if (sectionsError) throw sectionsError;

    // Get subsections and questions for each section
    const enriched = await Promise.all(
      (sections || []).map(async (section) => {
        const { data: subsections } = await supabase
          .from('induction_subsections')
          .select('*')
          .eq('induction_section_id', section.id);

        const subsectionsWithQuestions = await Promise.all(
          (subsections || []).map(async (sub) => {
            const { data: questions } = await supabase
              .from('induction_questions')
              .select('*')
              .eq('induction_subsection_id', sub.id);

            return { ...sub, questions };
          })
        );

        return { ...section, subsections: subsectionsWithQuestions };
      })
    );

    return { success: true, data: enriched };
  } catch (error) {
    console.error('Get induction templates error:', error);
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

// ============================================================================
// ADMIN: INDUCTION MANAGEMENT
// ============================================================================

/**
 * Get all induction sections
 * @returns {Array} All induction sections
 */
export async function getInductionSections() {
  try {
    const { data, error } = await supabase
      .from('induction_sections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching induction sections:', error);
    return [];
  }
}

/**
 * Create a new induction section
 * @param {Object} sectionData - { induction_name, description, service_id }
 * @returns {Object} Created section
 */
export async function createInductionSection(sectionData) {
  try {
    const { data, error } = await supabase
      .from('induction_sections')
      .insert([{
        business_unit_id: sectionData.business_unit_id,
        site_id: sectionData.site_id || null, // Empty string becomes NULL (all sites)
        induction_name: sectionData.induction_name,
        description: sectionData.description || '',
        service_id: sectionData.service_id,
      }])
      .select();

    if (error) throw error;
    return data ? data[0] : null;
  } catch (error) {
    console.error('Error creating induction section:', error);
    throw error;
  }
}

/**
 * Update an induction section
 * @param {UUID} sectionId
 * @param {Object} updates - { induction_name, description, service_id }
 * @returns {Object} Updated section
 */
export async function updateInductionSection(sectionId, updates) {
  try {
    const { data, error } = await supabase
      .from('induction_sections')
      .update({
        business_unit_id: updates.business_unit_id,
        site_id: updates.site_id || null, // Empty string becomes NULL (all sites)
        induction_name: updates.induction_name,
        description: updates.description || '',
        service_id: updates.service_id,
      })
      .eq('id', sectionId)
      .select();

    if (error) throw error;
    return data ? data[0] : null;
  } catch (error) {
    console.error('Error updating induction section:', error);
    throw error;
  }
}

/**
 * Delete an induction section (cascade deletes subsections and questions)
 * @param {UUID} sectionId
 */
export async function deleteInductionSection(sectionId) {
  try {
    const { error } = await supabase
      .from('induction_sections')
      .delete()
      .eq('id', sectionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting induction section:', error);
    throw error;
  }
}

/**
 * Create a new induction subsection (variant)
 * @param {UUID} sectionId
 * @param {Object} subsectionData - { subsection_name, video_url, video_duration }
 * @returns {Object} Created subsection
 */
export async function createInductionSubsection(sectionId, subsectionData) {
  try {
    const { data, error } = await supabase
      .from('induction_subsections')
      .insert([{
        induction_section_id: sectionId,
        subsection_name: subsectionData.subsection_name,
        video_url: subsectionData.video_url,
        video_duration: subsectionData.video_duration || 0,
      }])
      .select();

    if (error) throw error;
    return data ? data[0] : null;
  } catch (error) {
    console.error('Error creating induction subsection:', error);
    throw error;
  }
}

/**
 * Update an induction subsection
 * @param {UUID} subsectionId
 * @param {Object} updates - { subsection_name, video_url, video_duration }
 * @returns {Object} Updated subsection
 */
export async function updateInductionSubsection(subsectionId, updates) {
  try {
    const { data, error } = await supabase
      .from('induction_subsections')
      .update({
        subsection_name: updates.subsection_name,
        video_url: updates.video_url,
        video_duration: updates.video_duration || 0,
      })
      .eq('id', subsectionId)
      .select();

    if (error) throw error;
    return data ? data[0] : null;
  } catch (error) {
    console.error('Error updating induction subsection:', error);
    throw error;
  }
}

/**
 * Delete an induction subsection (cascade deletes questions)
 * @param {UUID} subsectionId
 */
export async function deleteInductionSubsection(subsectionId) {
  try {
    const { error } = await supabase
      .from('induction_subsections')
      .delete()
      .eq('id', subsectionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting induction subsection:', error);
    throw error;
  }
}

/**
 * Create a new induction question
 * @param {UUID} subsectionId
 * @param {Object} questionData - { question_text, options: [], correct_answer_index }
 * @returns {Object} Created question
 */
export async function createInductionQuestion(subsectionId, questionData) {
  try {
    const { data, error } = await supabase
      .from('induction_questions')
      .insert([{
        induction_subsection_id: subsectionId,
        question_text: questionData.question_text,
        options: questionData.options || [],
        correct_answer_index: questionData.correct_answer_index || 0,
      }])
      .select();

    if (error) throw error;
    return data ? data[0] : null;
  } catch (error) {
    console.error('Error creating induction question:', error);
    throw error;
  }
}

/**
 * Update an induction question
 * @param {UUID} questionId
 * @param {Object} updates - { question_text, options: [], correct_answer_index }
 * @returns {Object} Updated question
 */
export async function updateInductionQuestion(questionId, updates) {
  try {
    const { data, error } = await supabase
      .from('induction_questions')
      .update({
        question_text: updates.question_text,
        options: updates.options || [],
        correct_answer_index: updates.correct_answer_index || 0,
      })
      .eq('id', questionId)
      .select();

    if (error) throw error;
    return data ? data[0] : null;
  } catch (error) {
    console.error('Error updating induction question:', error);
    throw error;
  }
}

/**
 * Delete an induction question
 * @param {UUID} questionId
 */
export async function deleteInductionQuestion(questionId) {
  try {
    const { error } = await supabase
      .from('induction_questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting induction question:', error);
    throw error;
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
  // New comprehensive system
  getInductionsForContractor,
  getInductionSubsections,
  getInductionQuestions,
  saveInductionProgress,
  completeInductionSubsection,
  createInductionTemplate,
  getInductionTemplates,
  // Admin management
  getInductionSections,
  createInductionSection,
  updateInductionSection,
  deleteInductionSection,
  createInductionSubsection,
  updateInductionSubsection,
  deleteInductionSubsection,
  createInductionQuestion,
  updateInductionQuestion,
  deleteInductionQuestion,
};

/**
 * Visitor Inductions API
 * Handles fetching and updating visitor induction content
 */

import { supabase } from '../supabaseClient';

/**
 * Get visitor induction content for a site
 * @param {UUID} siteId - Site ID
 * @returns {Object} Induction content and PDF URL
 */
export async function getVisitorInduction(siteId) {
  try {
    const { data, error } = await supabase
      .from('visitor_inductions')
      .select('id, content, pdf_file_url, pdf_file_name')
      .eq('site_id', siteId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return content or default message
    return {
      success: true,
      data: data || {
        id: null,
        content: 'Welcome to our site. Please comply with all safety procedures.',
        pdf_file_url: null,
        pdf_file_name: null,
      },
    };
  } catch (error) {
    console.error('Error fetching visitor induction:', error);
    return {
      success: false,
      error: error.message,
      data: {
        id: null,
        content: 'Welcome to our site. Please comply with all safety procedures.',
      },
    };
  }
}

/**
 * Update visitor induction content for a site
 * @param {UUID} siteId - Site ID
 * @param {string} content - New induction content
 * @param {UUID} userId - User ID of the person making the update
 * @returns {Object} Updated induction
 */
export async function updateVisitorInduction(siteId, content, userId) {
  try {
    // Check if induction exists
    const { data: existing } = await supabase
      .from('visitor_inductions')
      .select('id')
      .eq('site_id', siteId)
      .single();

    let result;

    if (existing) {
      // Update existing
      result = await supabase
        .from('visitor_inductions')
        .update({
          content,
          last_updated_by: userId,
          last_updated_at: new Date().toISOString(),
        })
        .eq('site_id', siteId)
        .select()
        .single();
    } else {
      // Create new - get site details first
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('business_unit_id')
        .eq('id', siteId)
        .single();

      if (siteError) throw siteError;

      result = await supabase
        .from('visitor_inductions')
        .insert({
          site_id: siteId,
          business_unit_id: site.business_unit_id,
          content,
          last_updated_by: userId,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('Error updating visitor induction:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getVisitorInduction,
  updateVisitorInduction,
};

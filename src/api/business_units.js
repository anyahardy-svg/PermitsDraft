/**
 * Business Units API
 * Handles business unit management
 */

import { supabase } from '../supabaseClient';

/**
 * Get all business units
 * @returns {Array} All business units
 */
export async function listBusinessUnits() {
  try {
    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error listing business units:', error);
    return [];
  }
}

/**
 * Get a business unit by ID
 * @param {UUID} businessUnitId
 * @returns {Object} Business unit
 */
export async function getBusinessUnit(businessUnitId) {
  try {
    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .eq('id', businessUnitId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching business unit:', error);
    return null;
  }
}

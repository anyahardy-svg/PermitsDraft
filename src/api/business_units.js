/**
 * Business Units API
 * Handles business unit management
 */

import { supabase } from '../supabaseClient';
import { handleError } from '../utils/errorHandler';

/**
 * Get all business units
 * RELIABILITY: Auto-retries on network failure, returns empty array gracefully
 * @returns {Array} All business units
 */
export async function listBusinessUnits() {
  let lastError;
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('business_units')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (process.env.NODE_ENV === 'development' && attempt > 1) {
        console.log(`🔄 Business units loaded on attempt ${attempt}/${maxRetries}`);
      }
      return data || [];
    } catch (error) {
      lastError = error;

      if (process.env.NODE_ENV === 'development') {
        console.warn(`⏳ Business units load attempt ${attempt}/${maxRetries} failed:`, error.message);
      }

      // Retry if not the last attempt
      if (attempt < maxRetries) {
        const delayMs = baseDelay * attempt;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  handleError(lastError, 'loading business units', false);
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Failed to load business units after retries');
  }
  return [];
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

/**
 * Create a new business unit
 * @param {Object} businessUnitData - Business unit information
 * @returns {Object} Created business unit
 */
export async function createBusinessUnit(businessUnitData) {
  try {
    const { data, error } = await supabase
      .from('business_units')
      .insert([{
        name: businessUnitData.name || '',
        description: businessUnitData.description || ''
      }])
      .select();

    if (error) throw error;

    return data[0] || null;
  } catch (error) {
    console.error('Error creating business unit:', error);
    throw error;
  }
}

/**
 * Update a business unit
 * @param {UUID} businessUnitId - Business unit ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated business unit
 */
export async function updateBusinessUnit(businessUnitId, updates) {
  try {
    const { data, error } = await supabase
      .from('business_units')
      .update({
        name: updates.name || undefined,
        description: updates.description || undefined
      })
      .eq('id', businessUnitId)
      .select();

    if (error) throw error;

    return data[0] || null;
  } catch (error) {
    console.error('Error updating business unit:', error);
    throw error;
  }
}

/**
 * Delete a business unit
 * @param {UUID} businessUnitId - Business unit ID
 * @returns {boolean} Success status
 */
export async function deleteBusinessUnit(businessUnitId) {
  try {
    const { error } = await supabase
      .from('business_units')
      .delete()
      .eq('id', businessUnitId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting business unit:', error);
    throw error;
  }
}

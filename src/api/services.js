/**
 * Services API
 * Handles service management linked to business units
 */

import { supabase } from '../supabaseClient';
import { handleError } from '../utils/errorHandler';

/**
 * Get all services for a business unit
 * @param {UUID} businessUnitId
 * @returns {Array} Services for the business unit
 */
export async function listServicesByBusinessUnit(businessUnitId) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_unit_id', businessUnitId)
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error listing services:', error);
    return [];
  }
}

/**
 * Get all services (across all business units)
 * RELIABILITY: Auto-retries on network failure, returns empty array on failure
 * @returns {Array} All services
 */
export async function listAllServices() {
  let lastError;
  const maxRetries = 2;
  const baseDelay = 500;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('business_unit_id, name', { ascending: true });

      if (error) throw error;

      if (process.env.NODE_ENV === 'development' && attempt > 1) {
        console.log(`🔄 Services loaded on attempt ${attempt}`);
      }
      return data || [];
    } catch (error) {
      lastError = error;

      if (process.env.NODE_ENV === 'development') {
        console.warn(`⏳ Services load attempt ${attempt}/${maxRetries} failed:`, error.message);
      }

      // Retry if not the last attempt
      if (attempt < maxRetries) {
        const delayMs = baseDelay * attempt;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  handleError(lastError, 'loading services', false);
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Failed to load services after retries');
  }
  return [];
}

/**
 * Create a new service
 * @param {Object} serviceData - { business_unit_id, name, description }
 * @returns {Object} Created service
 */
export async function createService(serviceData) {
  try {
    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating service:', error);
    throw error;
  }
}

/**
 * Update a service
 * @param {UUID} serviceId
 * @param {Object} updates - { name, description }
 * @returns {Object} Updated service
 */
export async function updateService(serviceId, updates) {
  try {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating service:', error);
    throw error;
  }
}

/**
 * Delete a service
 * @param {UUID} serviceId
 * @returns {boolean} Success
 */
export async function deleteService(serviceId) {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
}

export default {
  listServicesByBusinessUnit,
  listAllServices,
  createService,
  updateService,
  deleteService,
};

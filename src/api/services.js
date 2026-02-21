/**
 * Services API
 * Handles service management linked to business units
 */

import { supabase } from '../supabaseClient';

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
 * @returns {Array} All services
 */
export async function listAllServices() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('business_unit_id, name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error listing all services:', error);
    return [];
  }
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

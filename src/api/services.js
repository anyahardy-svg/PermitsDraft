/**
 * Services API
 * Global services list with per-service business unit applicability
 */

import { supabase } from '../supabaseClient';
import { handleError } from '../utils/errorHandler';
import {
  getApplicableBusinessUnitIds,
  isServiceApplicableToBusinessUnits,
  filterServicesForBusinessUnits,
} from '../utils/serviceApplicability';

export {
  getApplicableBusinessUnitIds,
  isServiceApplicableToBusinessUnits,
  filterServicesForBusinessUnits,
};

function normalizeService(service) {
  if (!service) return service;

  return {
    ...service,
    applicable_business_unit_ids: getApplicableBusinessUnitIds(service),
    applicableBusinessUnitIds: getApplicableBusinessUnitIds(service),
  };
}

/**
 * Get services applicable to a single business unit
 * @param {UUID} businessUnitId
 * @returns {Array} Services for the business unit
 */
export async function listServicesByBusinessUnit(businessUnitId) {
  return listServicesForBusinessUnits([businessUnitId]);
}

/**
 * Get services applicable to any of the given business units
 * @param {UUID[]} businessUnitIds
 * @returns {Array} Applicable services
 */
export async function listServicesForBusinessUnits(businessUnitIds = []) {
  try {
    const allServices = await listAllServices();
    return filterServicesForBusinessUnits(allServices, businessUnitIds);
  } catch (error) {
    console.error('Error listing services for business units:', error);
    return [];
  }
}

/**
 * Get all services
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
        .order('name', { ascending: true });

      if (error) throw error;

      if (process.env.NODE_ENV === 'development' && attempt > 1) {
        console.log(`🔄 Services loaded on attempt ${attempt}`);
      }
      return (data || []).map(normalizeService);
    } catch (error) {
      lastError = error;

      if (process.env.NODE_ENV === 'development') {
        console.warn(`⏳ Services load attempt ${attempt}/${maxRetries} failed:`, error.message);
      }

      if (attempt < maxRetries) {
        const delayMs = baseDelay * attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  handleError(lastError, 'loading services', false);
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Failed to load services after retries');
  }
  return [];
}

/**
 * Create a new service
 * @param {Object} serviceData - { name, description, applicable_business_unit_ids }
 * @returns {Object} Created service
 */
export async function createService(serviceData) {
  try {
    const payload = {
      name: serviceData.name,
      description: serviceData.description || '',
      applicable_business_unit_ids:
        serviceData.applicable_business_unit_ids ||
        serviceData.applicableBusinessUnitIds ||
        [],
    };

    const { data, error } = await supabase
      .from('services')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return normalizeService(data);
  } catch (error) {
    console.error('Error creating service:', error);
    throw error;
  }
}

/**
 * Update a service
 * @param {UUID} serviceId
 * @param {Object} updates - { name, description, applicable_business_unit_ids }
 * @returns {Object} Updated service
 */
export async function updateService(serviceId, updates) {
  try {
    const payload = { ...updates };

    if (updates.applicableBusinessUnitIds !== undefined) {
      payload.applicable_business_unit_ids = updates.applicableBusinessUnitIds;
      delete payload.applicableBusinessUnitIds;
    }

    const { data, error } = await supabase
      .from('services')
      .update(payload)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;

    return normalizeService(data);
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
  getApplicableBusinessUnitIds,
  isServiceApplicableToBusinessUnits,
  filterServicesForBusinessUnits,
  listServicesByBusinessUnit,
  listServicesForBusinessUnits,
  listAllServices,
  createService,
  updateService,
  deleteService,
};

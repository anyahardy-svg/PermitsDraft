/**
 * Contractor Authentication API
 * Handles PIN-based login, PIN setup, and PIN reset for contractors
 */

import { supabase } from '../supabaseClient';

/**
 * Get all contractors for contractor name selection
 */
export async function getAllContractors() {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, name, company_id')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify contractor PIN
 * @param {UUID} contractorId - Contractor ID
 * @param {string} pin - PIN to verify
 * @returns {Object} { success: boolean, data: contractor if valid }
 */
export async function verifyContractorPin(contractorId, pin) {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, name, company_id, login_pin')
      .eq('id', contractorId)
      .single();
    
    if (error) throw error;
    
    // Check if contractor has a PIN set
    if (!data.login_pin) {
      return { 
        success: false, 
        error: 'No PIN set',
        needsSetup: true,
        contractor: { id: data.id, name: data.name, company_id: data.company_id }
      };
    }
    
    // Verify PIN matches
    if (data.login_pin !== pin) {
      return { success: false, error: 'Invalid PIN' };
    }
    
    return { 
      success: true, 
      data: { id: data.id, name: data.name, company_id: data.company_id }
    };
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set or update contractor PIN
 * @param {UUID} contractorId - Contractor ID
 * @param {string} newPin - New PIN (6 digits)
 * @returns {Object} { success: boolean }
 */
export async function setContractorPin(contractorId, newPin) {
  try {
    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(newPin)) {
      return { success: false, error: 'PIN must be exactly 6 digits' };
    }
    
    const { error } = await supabase
      .from('contractors')
      .update({
        login_pin: newPin,
        pin_last_updated: new Date().toISOString()
      })
      .eq('id', contractorId);
    
    if (error) throw error;
    return { success: true, message: 'PIN set successfully' };
  } catch (error) {
    console.error('Error setting PIN:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset contractor PIN
 * Same as setContractorPin but for when user forgot it
 */
export async function resetContractorPin(contractorId, newPin) {
  return setContractorPin(contractorId, newPin);
}

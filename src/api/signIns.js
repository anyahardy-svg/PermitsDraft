/**
 * Sign-Ins API
 * Handles kiosk check-in/out and contractor presence tracking
 */

import { supabase } from '../supabaseClient';

// ============================================================================
// CHECK-IN FUNCTIONS
// ============================================================================

/**
 * Contractor Sign-In (Kiosk)
 * @param {UUID} contractorId - Contractor UUID
 * @param {UUID} siteId - Site UUID
 * @param {UUID} businessUnitId - Business Unit UUID
 * @returns {Object} Sign-in record
 */
export async function checkInContractor(contractorId, siteId, businessUnitId) {
  try {
    // Get contractor details including site_ids and induction_expiry
    const { data: contractor } = await supabase
      .from('contractors')
      .select('name, phone, company_id, site_ids, induction_expiry, services')
      .eq('id', contractorId)
      .single();

    if (!contractor) {
      return { success: false, error: 'Contractor not found' };
    }

    // Check if inducted at this site and if expired
    const isInductedHere = contractor.site_ids && contractor.site_ids.includes(siteId);
    const isExpired = contractor.induction_expiry && new Date(contractor.induction_expiry) < new Date();
    const induction = isInductedHere ? {
      expires_at: contractor.induction_expiry,
      inducted_at: contractor.services // Using services as a proxy for what they're inducted for
    } : null;

    // Get company name if available
    const { data: company } = contractor?.company_id
      ? await supabase.from('companies').select('name').eq('id', contractor.company_id).single()
      : { data: null };

    // Create sign-in record
    const { data, error } = await supabase
      .from('sign_ins')
      .insert({
        contractor_id: contractorId,
        contractor_name: contractor?.name || 'Unknown',
        contractor_phone: contractor?.phone || null,
        site_id: siteId,
        business_unit_id: businessUnitId,
        contractor_company: company?.name || 'Unknown',
        check_in_time: new Date().toISOString(),
        inducted: isInductedHere,
        induction_status: isExpired ? 'induction_expired' : (isInductedHere ? 'inducted' : 'not_inducted'),
        inducted_at_site: contractor.induction_expiry || null,
        induction_expires_at: contractor.induction_expiry || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Format expiry date for display
    const expiryDate = contractor.induction_expiry ? new Date(contractor.induction_expiry).toLocaleDateString('en-NZ') : null;

    return {
      success: true,
      data,
      inducted: isInductedHere,
      isExpired,
      expiryDate,
      message: isExpired 
        ? '⚠️ INDUCTION EXPIRED - renewal required before work' 
        : isInductedHere 
          ? 'Checked in successfully' 
          : '⚠️ NOT INDUCTED - induction required before work',
    };
  } catch (error) {
    console.error('Check-in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Visitor Sign-In (Third-party visitors)
 * @param {string} visitorName
 * @param {string} company
 * @param {UUID} siteId
 * @param {UUID} businessUnitId
 * @param {string} phone - Phone number
 * @returns {Object} Sign-in record
 */
export async function checkInVisitor(visitorName, company, siteId, businessUnitId, phone) {
  try {
    const { data, error } = await supabase
      .from('sign_ins')
      .insert({
        visitor_name: visitorName,
        visitor_company: company,
        phone_number: phone,
        site_id: siteId,
        business_unit_id: businessUnitId,
        check_in_time: new Date().toISOString(),
        inducted: true, // Visitors don't need induction check
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Visitor check-in error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CHECK-OUT FUNCTIONS
// ============================================================================

/**
 * Sign-Out (works for both contractors and visitors)
 * @param {UUID} signInId - Sign-in record ID
 * @returns {Object} Updated sign-in record with duration
 */
export async function checkOut(signInId) {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('sign_ins')
      .update({
        check_out_time: now,
        updated_at: now,
      })
      .eq('id', signInId)
      .select()
      .single();

    if (error) throw error;

    // Calculate duration in minutes
    const checkInTime = new Date(data.check_in_time);
    const checkOutTime = new Date(data.check_out_time);
    const durationMinutes = Math.round((checkOutTime - checkInTime) / 60000);

    return {
      success: true,
      data: { ...data, duration_minutes: durationMinutes },
    };
  } catch (error) {
    console.error('Check-out error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all currently signed-in people at a site
 * @param {UUID} siteId
 * @returns {Array} List of people currently on-site
 */
export async function getSignedInPeople(siteId) {
  try {
    const { data, error } = await supabase
      .from('sign_ins')
      .select(`
        id,
        contractor_id,
        contractor_name,
        contractor_phone,
        contractor_company,
        visitor_name,
        visitor_company,
        phone_number,
        check_in_time,
        inducted,
        induction_status
      `)
      .eq('site_id', siteId)
      .is('check_out_time', null) // Currently signed in (no check-out time)
      .order('check_in_time', { ascending: false });

    if (error) throw error;

    // Return data as-is (no need for separate enrichment)
    return { success: true, data };
  } catch (error) {
    console.error('Get signed-in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get sign-in history for a site (date range)
 * @param {UUID} siteId
 * @param {string} startDate - ISO date
 * @param {string} endDate - ISO date
 * @returns {Array} Sign-in records
 */
export async function getSignInHistory(siteId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('sign_ins')
      .select('*')
      .eq('site_id', siteId)
      .gte('check_in_time', startDate)
      .lte('check_in_time', endDate)
      .order('check_in_time', { ascending: false });

    if (error) throw error;

    // Enrich with names and duration
    const enriched = data.map((record) => {
      const checkInTime = new Date(record.check_in_time);
      const checkOutTime = record.check_out_time ? new Date(record.check_out_time) : new Date();
      const durationMinutes = Math.round((checkOutTime - checkInTime) / 60000);

      return {
        ...record,
        name: record.contractor_id ? `Contractor: ${record.contractor_company}` : record.visitor_name,
        duration_minutes: durationMinutes,
      };
    });

    return { success: true, data: enriched };
  } catch (error) {
    console.error('Get history error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get sign-in stats for a contractor (hours worked per site)
 * @param {UUID} contractorId
 * @returns {Object} Hours worked per site
 */
export async function getContractorHours(contractorId) {
  try {
    const { data, error } = await supabase
      .from('sign_ins')
      .select(`
        site_id,
        check_in_time,
        check_out_time
      `)
      .eq('contractor_id', contractorId)
      .not('check_out_time', 'is', null); // Only completed sign-outs

    if (error) throw error;

    // Aggregate hours by site
    const hoursBySite = {};
    data.forEach((record) => {
      const siteId = record.site_id;
      const checkInTime = new Date(record.check_in_time);
      const checkOutTime = new Date(record.check_out_time);
      const durationMinutes = (checkOutTime - checkInTime) / 60000;

      hoursBySite[siteId] = (hoursBySite[siteId] || 0) + durationMinutes / 60;
    });

    return { success: true, data: hoursBySite };
  } catch (error) {
    console.error('Get contractor hours error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  checkInContractor,
  checkInVisitor,
  checkOut,
  getSignedInPeople,
  getSignInHistory,
  getContractorHours,
};

import { supabase } from '../supabaseClient';
import { inviteContractor } from './contractorAuth';

/**
 * Submit a request to join a company
 * @param {string} email - Contractor email
 * @param {string} name - Contractor name
 * @param {string} phone - Contractor phone (optional)
 * @param {string} companyId - UUID of company to join
 * @param {string} companyName - Name of company (fallback if company_id not found)
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function submitJoinRequest(email, name, phone, companyId, companyName) {
  try {
    console.log('📝 Submitting join request:', { email, name, companyId, companyName });

    // Check if request already exists for this email/company
    const { data: existingRequest, error: checkError } = await supabase
      .from('contractor_join_requests')
      .select('id, status')
      .eq('email', email)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .single();

    if (!checkError && existingRequest) {
      return {
        success: false,
        error: 'You already have a pending request for this company. Please wait for admin review.'
      };
    }

    // Create the join request
    const { data, error } = await supabase
      .from('contractor_join_requests')
      .insert([
        {
          email,
          name,
          phone: phone || null,
          company_id: companyId || null,
          company_name: companyName,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error submitting join request:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Join request submitted:', data[0]);
    return {
      success: true,
      message: `Your request to join ${companyName} has been submitted. An admin will review it within 24 hours.`,
      requestId: data[0]?.id
    };
  } catch (error) {
    console.error('❌ Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending join requests for a company (admin only)
 * @param {string} companyId - UUID of company
 * @returns {Object} { success: boolean, data: Array, error: string }
 */
export async function getPendingJoinRequests(companyId) {
  try {
    console.log('🔍 Fetching pending join requests for company:', companyId);

    const { data, error } = await supabase
      .from('contractor_join_requests')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching requests:', error);
      return { success: false, error: error.message, data: [] };
    }

    console.log('✅ Fetched', data?.length || 0, 'pending requests');
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get all join requests for a company (admin only) - includes history
 * @param {string} companyId - UUID of company
 * @returns {Object} { success: boolean, data: Array, error: string }
 */
export async function getAllJoinRequests(companyId) {
  try {
    console.log('🔍 Fetching all join requests for company:', companyId);

    const { data, error } = await supabase
      .from('contractor_join_requests')
      .select('*')
      .eq('company_id', companyId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching requests:', error);
      return { success: false, error: error.message, data: [] };
    }

    console.log('✅ Fetched', data?.length || 0, 'total requests');
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Approve a join request and create contractor record
 * @param {string} requestId - UUID of join request
 * @param {string} adminId - UUID of admin approving
 * @param {string} companyIdOverride - Optional company_id to use if request doesn't have one
 * @returns {Object} { success: boolean, message: string, error: string, contractorId: string }
 */
export async function approveJoinRequest(requestId, adminId, companyIdOverride) {
  try {
    console.log('✅ Approving join request:', requestId);

    // Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('contractor_join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Request not found' };
    }

    // Use override company_id if provided, otherwise use request's company_id
    const companyIdToUse = companyIdOverride || request.company_id;

    if (!companyIdToUse) {
      return { success: false, error: 'No company specified. Admin must select a company.' };
    }

    // Create contractor record
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .insert([
        {
          name: request.name,
          email: request.email,
          company_id: companyIdToUse,
          phone: request.phone
        }
      ])
      .select();

    if (contractorError) {
      console.error('❌ Error creating contractor:', contractorError);
      return { success: false, error: 'Failed to create contractor record: ' + contractorError.message };
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('contractor_join_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        company_id: companyIdToUse  // Save the selected company_id
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Error updating request:', updateError);
      return { success: false, error: 'Failed to update request status' };
    }

    console.log('✅ Join request approved, contractor created');

    // Send invitation email to contractor
    console.log('📧 Sending invitation email to:', request.email);
    const inviteResult = await inviteContractor(request.email);

    if (!inviteResult.success) {
      console.warn('⚠️ Invitation email failed:', inviteResult.error);
      // Still return success since contractor record was created
      // Admin can manually resend invitation if needed
    }

    return {
      success: true,
      message: inviteResult.success 
        ? `Approved! Invitation email sent to ${request.email}`
        : `Approved! Contractor created, but invitation email failed. They can sign up manually.`,
      contractorId: contractor[0]?.id
    };
  } catch (error) {
    console.error('❌ Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a join request
 * @param {string} requestId - UUID of join request
 * @param {string} adminId - UUID of admin rejecting
 * @param {string} reason - Reason for rejection
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function rejectJoinRequest(requestId, adminId, reason) {
  try {
    console.log('❌ Rejecting join request:', requestId);

    const { error } = await supabase
      .from('contractor_join_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        rejection_reason: reason
      })
      .eq('id', requestId);

    if (error) {
      console.error('❌ Error rejecting request:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Join request rejected');
    return {
      success: true,
      message: 'Request rejected'
    };
  } catch (error) {
    console.error('❌ Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get join request count by company
 * @param {string} companyId - UUID of company
 * @returns {Object} { success: boolean, data: { pending: number, approved: number, rejected: number }, error: string }
 */
export async function getJoinRequestStats(companyId) {
  try {
    const { data: requests, error } = await supabase
      .from('contractor_join_requests')
      .select('status')
      .eq('company_id', companyId);

    if (error) {
      return { success: false, error: error.message };
    }

    const stats = {
      pending: requests?.filter(r => r.status === 'pending').length || 0,
      approved: requests?.filter(r => r.status === 'approved').length || 0,
      rejected: requests?.filter(r => r.status === 'rejected').length || 0
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('❌ Exception:', error);
    return { success: false, error: error.message };
  }
}

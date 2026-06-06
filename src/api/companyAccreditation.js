/**
 * Company Accreditation API
 * Handles sending accreditation invitations and requests
 */

import { supabase } from '../supabaseClient';
import { sendAccreditationInvitation, sendInvitationRequest } from './sendgrid';

/**
 * Send accreditation invitation to a company contact
 * @param {Object} params
 * @returns {Promise<{success: boolean, message: string, error?: string}>}
 */
export const sendAccreditationInvitationEmail = async ({
  companyId,
  email,
  companyName,
  deadline,
}) => {
  try {
    console.log('📧 Sending accreditation invitation to:', email, 'for', companyName);

    // User lookup/creation must happen server-side because Supabase admin APIs
    // require service-role credentials that must never be exposed to browsers.
    const emailResult = await sendAccreditationInvitation(
      email,
      companyName,
      deadline,
      false,
      companyId
    );

    if (!emailResult.success) {
      return { 
        success: false, 
        error: emailResult.error || 'Failed to send invitation email' 
      };
    }

    console.log('✅ Accreditation invitation sent successfully');
    return {
      success: true,
      message: `Accreditation invitation sent to ${email}`,
    };
  } catch (error) {
    console.error('❌ Error in sendAccreditationInvitationEmail:', error);
    return {
      success: false,
      error: error.message || 'An error occurred sending the invitation',
    };
  }
};

/**
 * Send invitation request to support@contractorhq.co.nz
 * @param {Object} data
 * @returns {Promise<{success: boolean, message: string, error?: string}>}
 */
export const submitAccreditationRequest = async (data) => {
  try {
    console.log('📧 Submitting accreditation request:', data);

    const result = await sendInvitationRequest(data);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send request',
      };
    }

    return {
      success: true,
      message: 'Your request has been sent to our team. We will contact you shortly.',
    };
  } catch (error) {
    console.error('❌ Error submitting accreditation request:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit request',
    };
  }
};

/**
 * Get accreditation invitation status for a company
 * @param {string} companyId
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getAccreditationStatus = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, accreditation_deadline, accreditation_invitation_sent_at')
      .eq('id', companyId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error getting accreditation status:', error);
    return { success: false, error: error.message };
  }
};

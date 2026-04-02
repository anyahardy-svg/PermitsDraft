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

    // Check if user exists in Supabase auth
    let isNewUser = false;
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers({
        pageSize: 1,
      });
      
      // Try to get their auth record - this is a bit tricky since we don't have direct access
      // We'll assume they're new if we can't find them in contractors table
      const { data: contractorData } = await supabase
        .from('contractors')
        .select('id')
        .eq('email', email)
        .single();

      isNewUser = !contractorData;
    } catch (error) {
      // If lookup fails, treat as new user
      isNewUser = true;
    }

    // If new user, create an auth account for them
    if (isNewUser) {
      console.log('🆕 Creating new auth user for:', email);
      try {
        const { error: createError } = await supabase.auth.admin.createUser({
          email: email,
          email_confirm: false, // They'll set password via email link
          user_metadata: {
            company_id: companyId,
            company_name: companyName,
          },
        });

        if (createError) {
          console.error('❌ Error creating user:', createError);
          // If user already exists in auth, that's fine - they're not new
          if (!createError.message.includes('already exists')) {
            return { success: false, error: createError.message };
          }
          isNewUser = false;
        }
      } catch (error) {
        console.error('❌ Error creating user:', error);
        // Continue anyway - user might exist
      }
    }

    // Send the email
    const emailResult = await sendAccreditationInvitation(
      email,
      companyName,
      deadline,
      isNewUser
    );

    if (!emailResult.success) {
      return { 
        success: false, 
        error: emailResult.error || 'Failed to send invitation email' 
      };
    }

    // Update companies table with invitation tracking
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        accreditation_invitation_sent_at: new Date().toISOString(),
        accreditation_deadline: deadline,
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('❌ Error updating company:', updateError);
      return { 
        success: false, 
        error: 'Invitation sent but failed to update records' 
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

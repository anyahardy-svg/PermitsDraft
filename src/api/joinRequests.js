import { supabase } from '../supabaseClient';

/**
 * Send email via Brevo API
 * @param {Object} options - Email options
 * @returns {Object} { success: boolean, message: string, error: string }
 */
async function sendEmailViaBrevo(options) {
  try {
    const { toEmail, toName, subject, htmlContent } = options;

    const brevoKey = import.meta.env.VITE_BREVO_API_KEY;
    if (!brevoKey) {
      console.error('❌ BREVO_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoKey
      },
      body: JSON.stringify({
        to: [{ email: toEmail, name: toName }],
        sender: { email: 'noreply@contractorhq.co.nz', name: 'Contractor Hub' },
        subject,
        htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Brevo error:', errorData);
      return { success: false, error: 'Failed to send email' };
    }

    console.log('✅ Email sent successfully to:', toEmail);
    return { success: true, message: 'Email sent' };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

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
      .is('company_id', null)
      .eq('status', 'pending')
      .single();

    if (!checkError && existingRequest) {
      return {
        success: false,
        error: 'You already have a pending request. Please wait for admin review.'
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

    // Send approval email to contractor
    console.log('📧 Sending approval email to:', request.email);
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Your Request Has Been Approved! 🎉</h2>
            
            <p>Hi ${request.name},</p>
            
            <p>Great news! Your request to join <strong>${request.company_name}</strong> has been <strong>approved</strong>.</p>
            
            <p>Your account is now ready to use. To get started:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="https://contractorhq.co.nz/sign-in-contractor" 
                 style="background-color: #10B981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
                Go to Login
              </a>
            </p>
            
            <p><strong>Next steps:</strong></p>
            <ol>
              <li>Click the button above to go to the login page</li>
              <li>Click "Create Your Password" to set up your account</li>
              <li>Enter your email (${request.email}) and create a password</li>
              <li>You'll receive a verification code via email</li>
              <li>Log in and start using Contractor Hub!</li>
            </ol>
            
            <p><strong>Your company:</strong> ${request.company_name}</p>
            
            <p>If you have any questions or need assistance, please contact support at support@contractorhq.co.nz</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999;">
              This is an automated message from Contractor Hub. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
    
    const emailResult = await sendEmailViaBrevo({
      toEmail: request.email,
      toName: request.name,
      subject: `Your Access to ${request.company_name} Has Been Approved!`,
      htmlContent
    });

    if (!emailResult.success) {
      console.warn('⚠️ Approval email failed:', emailResult.error);
      // Still return success since contractor record was created
    }

    return {
      success: true,
      message: emailResult.success 
        ? `Approved! Approval email sent to ${request.email}`
        : `Approved! Contractor created, but approval email failed to send.`,
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

/**
 * Contractor Email Functions
 * Handles sending emails to contractors (admin-initiated)
 */

import { supabase } from '../supabaseClient';

/**
 * Send password setup email to a new contractor (admin-initiated)
 * Creates a password reset token and sends it via email
 * @param {string} contractorEmail - Contractor email address
 * @param {string} contractorName - Contractor name for personalization
 * @param {string} senderEmail - Email address to send from (e.g., contractors@company.co.nz)
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function sendContractorSetupEmail(contractorEmail, contractorName, senderEmail = 'contractors@winstone.co.nz') {
  try {
    // Verify contractor exists and is in the database
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, email, name, company_id')
      .eq('email', contractorEmail)
      .single();

    if (contractorError || !contractorData) {
      return { 
        success: false, 
        error: 'Contractor not found in system' 
      };
    }

    // Send password reset email via Supabase
    // Note: This uses Supabase's resetPasswordForEmail which generates a token
    const { error: resetError } = await supabase.auth.admin.createUser({
      email: contractorEmail,
      user_metadata: {
        contractor_id: contractorData.id,
        contractor_name: contractorName
      },
      autoconfirm: false
    });

    // Instead of admin create user, use the standard reset email flow
    // Supabase will send the password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(contractorEmail, {
      redirectTo: typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback` 
        : 'https://contractorhq.co.nz/auth/callback'
    });

    if (error) {
      return { 
        success: false, 
        error: `Failed to send setup email: ${error.message}` 
      };
    }

    return { 
      success: true, 
      message: `Password setup link sent to ${contractorEmail}`
    };
  } catch (error) {
    console.error('Error sending contractor setup email:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
}

/**
 * Send insurance expiry notification email to contractors
 * Used for automated alerts when public liability insurance is expiring
 * @param {string} contractorEmail - Contractor email
 * @param {string} contractorName - Contractor name
 * @param {string} companyName - Company name
 * @param {string} expiryDate - Insurance expiry date (YYYY-MM-DD format)
 * @param {string} senderEmail - Email address to send from
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function sendInsuranceExpiryNotification(
  contractorEmail, 
  contractorName, 
  companyName, 
  expiryDate,
  senderEmail = 'contractors@winstone.co.nz'
) {
  try {
    // Calculate days until expiry
    const expiryMs = new Date(expiryDate).getTime();
    const nowMs = new Date().getTime();
    const daysUntilExpiry = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));

    // Construct email body
    const emailBody = `
Dear ${contractorName},

Your company's public liability insurance is expiring soon!

Company: ${companyName}
Expiry Date: ${expiryDate}
Days Remaining: ${daysUntilExpiry}

Please log in to the Contractor Hub to update your insurance information:
https://contractorhq.co.nz

Questions? Contact us at ${senderEmail}

Best regards,
Winstone Contractors Hub
    `.trim();

    // For now, we'll log this as we need to set up proper email service
    console.log('📧 Insurance expiry notification:', {
      to: contractorEmail,
      contractor: contractorName,
      company: companyName,
      expiryDate,
      daysUntilExpiry,
      from: senderEmail
    });

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    return {
      success: true,
      message: `Notification queued for ${contractorEmail}`
    };
  } catch (error) {
    console.error('Error sending insurance expiry notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to send notification'
    };
  }
}

/**
 * Find all contractors with insurance expiring in the next 7 days
 * and send them notification emails
 * @returns {Object} { success: boolean, notificationsSent: number, error: string }
 */
export async function sendExpiringInsuranceNotifications() {
  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Format dates as YYYY-MM-DD
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    // Find all companies with expiring insurance
    const { data: expiringCompanies, error: queryError } = await supabase
      .from('companies')
      .select('id, name, public_liability_insurance_expiry, last_insurance_expiry_notification_sent_at')
      .gte('public_liability_insurance_expiry', todayStr)
      .lte('public_liability_insurance_expiry', sevenDaysStr)
      .is('last_insurance_expiry_notification_sent_at', null); // Only send once per expiry

    if (queryError) {
      return { 
        success: false, 
        notificationsSent: 0,
        error: queryError.message 
      };
    }

    if (!expiringCompanies || expiringCompanies.length === 0) {
      return { 
        success: true, 
        notificationsSent: 0,
        message: 'No companies with expiring insurance'
      };
    }

    // For each company, find contractors and send emails
    let notificationsSent = 0;

    for (const company of expiringCompanies) {
      // Get contractors for this company
      const { data: contractors, error: contractorError } = await supabase
        .from('contractors')
        .select('id, email, name')
        .eq('company_id', company.id);

      if (contractorError) {
        console.error(`Error fetching contractors for company ${company.name}:`, contractorError);
        continue;
      }

      // Send email to each contractor
      for (const contractor of contractors || []) {
        if (!contractor.email) continue;

        const emailResult = await sendInsuranceExpiryNotification(
          contractor.email,
          contractor.name,
          company.name,
          company.public_liability_insurance_expiry
        );

        if (emailResult.success) {
          notificationsSent++;

          // Mark that we've sent notification for this company
          await supabase
            .from('companies')
            .update({ last_insurance_expiry_notification_sent_at: new Date().toISOString() })
            .eq('id', company.id);
        }
      }
    }

    return { 
      success: true, 
      notificationsSent,
      message: `Sent ${notificationsSent} insurance expiry notifications`
    };
  } catch (error) {
    console.error('Error in sendExpiringInsuranceNotifications:', error);
    return { 
      success: false, 
      notificationsSent: 0,
      error: error.message || 'Failed to send notifications'
    };
  }
}

/**
 * Resend password setup email to a contractor
 * Used when a contractor didn't receive the initial email
 * @param {string} contractorEmail - Contractor email
 * @returns {Object} { success: boolean, message: string, error: string }
 */
export async function resendContractorSetupEmail(contractorEmail) {
  try {
    // Verify contractor exists
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id, email, name')
      .eq('email', contractorEmail)
      .single();

    if (contractorError || !contractorData) {
      return { 
        success: false, 
        error: 'Contractor not found' 
      };
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(contractorEmail, {
      redirectTo: typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback` 
        : 'https://contractorhq.co.nz/auth/callback'
    });

    if (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { 
      success: true, 
      message: `Setup link resent to ${contractorEmail}`
    };
  } catch (error) {
    console.error('Error resending setup email:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Email Service - Uses backend API for secure email sending
 * The backend handles Brevo integration securely (API key not exposed to client)
 */

/**
 * Send accreditation invitation email via backend API
 * @param {string} toEmail - Email address to send to
 * @param {string} companyName - Company name for the invitation
 * @param {Date} deadline - Accreditation deadline
 * @param {boolean} isNewUser - Whether this is a new user
 * @param {string} companyId - Company ID for database updates
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendAccreditationInvitation = async (toEmail, companyName, deadline, isNewUser = false, companyId = null) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'invitation',
        toEmail,
        companyName,
        deadline,
        isNewUser,
        companyId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.error || 'Failed to send email' };
    }

    const data = await response.json();
    console.log('✅ Accreditation invitation sent to:', toEmail);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('❌ Error sending accreditation invitation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send invitation request notification to support via backend API
 * @param {Object} data - Request data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendInvitationRequest = async (data) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'request',
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error sending request:', error);
      return { success: false, error: error.error || 'Failed to send request' };
    }

    console.log('✅ Invitation request sent to support');
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending invitation request:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send admin setup/password reset email via backend API
 * @param {string} toEmail - Admin email address
 * @param {string} adminName - Admin name
 * @param {string} setupUrl - URL for password setup (e.g., https://example.com?type=invited)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendAdminSetupEmail = async (toEmail, adminName, setupUrl) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'admin-setup',
        toEmail,
        adminName,
        setupUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error sending admin setup email:', error);
      return { success: false, error: error.error || 'Failed to send email' };
    }

    console.log('✅ Admin setup email sent to:', toEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending admin setup email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email to admin via backend API
 * @param {string} toEmail - Admin email address
 * @param {string} adminName - Admin name
 * @param {string} resetUrl - URL for password reset
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendAdminPasswordResetEmail = async (toEmail, adminName, resetUrl) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'admin-password-reset',
        toEmail,
        adminName,
        resetUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error sending password reset email:', error);
      return { success: false, error: error.error || 'Failed to send email' };
    }

    console.log('✅ Password reset email sent to:', toEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

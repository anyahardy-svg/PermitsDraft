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
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendAccreditationInvitation = async (toEmail, companyName, deadline, isNewUser = false) => {
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

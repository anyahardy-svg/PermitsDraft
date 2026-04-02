/**
 * Brevo Email Integration
 * Handles all outbound emails via Brevo (formerly Sendinblue)
 */

const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY;
const FROM_EMAIL = 'noreply@contractorhq.co.nz';
const FROM_NAME = 'Contractor HQ';
const SUPPORT_EMAIL = 'support@contractorhq.co.nz';

/**
 * Send accreditation invitation email via Brevo
 * @param {string} toEmail - Email address to send to
 * @param {string} companyName - Company name for the invitation
 * @param {Date} deadline - Accreditation deadline
 * @param {boolean} isNewUser - Whether this is a new user
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendAccreditationInvitation = async (toEmail, companyName, deadline, isNewUser = false) => {
  try {
    if (!BREVO_API_KEY) {
      console.error('❌ Brevo API key not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-NZ', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'As soon as possible';

    const subject = isNewUser 
      ? `${companyName} - Complete Your Company Accreditation`
      : `Request to Complete ${companyName} Accreditation`;

    const htmlContent = isNewUser 
      ? `
        <h2>Complete Your Company Accreditation</h2>
        <p>Hello,</p>
        <p>${companyName} is requesting that you complete an accreditation questionnaire.</p>
        <p><strong>Deadline:</strong> ${deadlineStr}</p>
        <p>To get started, you'll need to create a password and access our portal:</p>
        <p><a href="https://contractorhq.co.nz/sign-in-contractor" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Set Password & Begin Accreditation</a></p>
        <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
      `
      : `
        <h2>Complete Your Company Accreditation</h2>
        <p>Hello,</p>
        <p>${companyName} is requesting that you complete an accreditation questionnaire.</p>
        <p><strong>Deadline:</strong> ${deadlineStr}</p>
        <p>To complete the accreditation, please log in to your account:</p>
        <p><a href="https://contractorhq.co.nz/sign-in-contractor" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Login to Contractor Hub</a></p>
        <p>If you've forgotten your password, click "Forgot?" on the login page to reset it.</p>
        <p>If you have any questions, please contact us at ${SUPPORT_EMAIL}</p>
      `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: toEmail }],
        subject: subject,
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Brevo error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
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
 * Send invitation request notification to support
 * @param {Object} data - Request data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendInvitationRequest = async (data) => {
  try {
    if (!BREVO_API_KEY) {
      console.error('❌ Brevo API key not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const { name, email, companyName } = data;

    const htmlContent = `
      <h2>New Accreditation Invitation Request</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><a href="mailto:${email}">Reply to ${name}</a></p>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: SUPPORT_EMAIL }],
        subject: `[Accreditation Request] ${companyName} - ${name}`,
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Brevo error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log('✅ Invitation request sent to support');
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending invitation request:', error);
    return { success: false, error: error.message };
  }
};

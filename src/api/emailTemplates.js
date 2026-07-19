/**
 * Email Templates API
 * Functions to get, create, update, and delete email templates from database
 */
import { supabase } from '../supabaseClient';

/**
 * Get all active email templates
 */
export const ensureDefaultEmailTemplates = async () => {
  try {
    const response = await fetch('/api/ensure-email-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to ensure email templates');
    }

    return { success: true, ...(await response.json()) };
  } catch (error) {
    console.error('Error ensuring email templates:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get all active email templates
 */
export const getAllEmailTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching email templates:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get a specific email template by type
 */
export const getEmailTemplate = async (type) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error fetching email template (${type}):`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Update an email template
 */
export const updateEmailTemplate = async (type, { name, subject, html_content, description, updated_by }) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        name,
        subject,
        html_content,
        description,
        updated_by,
        updated_at: new Date().toISOString(),
      })
      .eq('type', type)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error(`Error updating email template (${type}):`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Create a new email template
 */
export const createEmailTemplate = async ({ type, name, subject, html_content, description, variables = [] }) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .insert([
        {
          type,
          name,
          subject,
          html_content,
          description,
          variables,
          is_active: true,
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error creating email template:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete (deactivate) an email template
 */
export const deleteEmailTemplate = async (type) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .update({ is_active: false })
      .eq('type', type)
      .select();

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`Error deleting email template (${type}):`, error.message);
    return { success: false, error: error.message };
  }
};

const TEMPLATE_VARIABLE_DEFAULTS = {
  contactName: 'Contractor',
};

/**
 * Replace variables in email template
 * Variables use {{variableName}} format
 */
/**
 * Send a one-off test accreditation reminder email (includes logos + footer).
 * Does not update company reminder tracking or affect the cron batch.
 */
export const sendTestAccreditationReminderEmail = async ({
  toEmail,
  companyName,
  contactName,
  companyId,
  deadline,
}) => {
  try {
    const response = await fetch('/api/send-test-accreditation-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toEmail,
        companyName,
        contactName,
        companyId,
        deadline,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send test reminder email' };
    }

    return { success: true, message: data.message, messageId: data.messageId };
  } catch (error) {
    console.error('Error sending test accreditation reminder:', error.message);
    return { success: false, error: error.message };
  }
};

export const renderEmailTemplate = (template, variables = {}) => {
  let subject = template.subject;
  let content = template.html_content;

  const templateVariables = Array.isArray(template?.variables) ? template.variables : [];
  const keys = new Set([
    ...templateVariables,
    ...Object.keys(TEMPLATE_VARIABLE_DEFAULTS),
    ...Object.keys(variables),
  ]);

  keys.forEach((key) => {
    const rawValue = variables[key];
    const hasValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';
    const value = hasValue ? String(rawValue).trim() : (TEMPLATE_VARIABLE_DEFAULTS[key] || '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    content = content.replace(regex, value);
  });

  return { subject, content };
};

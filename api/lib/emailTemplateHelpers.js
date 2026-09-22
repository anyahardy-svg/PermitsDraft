const DEFAULT_SIGNUP_BUTTON_LABEL = 'Access Contractor HQ';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSignupUrl(toEmail, companyId) {
  const companyIdParam = companyId ? `&companyId=${encodeURIComponent(companyId)}` : '';
  return `https://contractorhq.co.nz/sign-in-contractor?type=invited&email=${encodeURIComponent(toEmail)}${companyIdParam}`;
}

function buildSignupUrlButtonHtml(signupUrl, label = DEFAULT_SIGNUP_BUTTON_LABEL) {
  const safeLabel = escapeHtml(label);

  return `<a href="${signupUrl}" style="background-color: #3B82F6; color: white; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 6px; display: inline-block;">${safeLabel}</a>`;
}

function buildSignupUrlButtonTableHtml(signupUrl, label = DEFAULT_SIGNUP_BUTTON_LABEL) {
  const buttonHtml = buildSignupUrlButtonHtml(signupUrl, label);

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:25px 0;">
  <tr>
    <td align="center">
      ${buttonHtml}
    </td>
  </tr>
</table>`;
}

function buildInvitationTemplateVariables({
  toEmail,
  companyId,
  companyName,
  contactName,
  deadline,
  supportEmail,
  signupButtonLabel = DEFAULT_SIGNUP_BUTTON_LABEL,
}) {
  const signupUrl = buildSignupUrl(toEmail, companyId);

  return {
    companyName,
    contactName,
    deadline,
    signupUrl,
    signupUrlButton: buildSignupUrlButtonHtml(signupUrl, signupButtonLabel),
    signupUrlButtonTable: buildSignupUrlButtonTableHtml(signupUrl, signupButtonLabel),
    supportEmail,
  };
}

function renderTemplate(template, variables = {}, defaults = {}) {
  let subject = template.subject;
  let content = template.html_content;

  const templateVariables = Array.isArray(template?.variables) ? template.variables : [];
  const keys = new Set([
    ...templateVariables,
    ...Object.keys(defaults),
    ...Object.keys(variables),
  ]);

  keys.forEach((key) => {
    const rawValue = variables[key];
    const hasValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';
    const value = hasValue ? String(rawValue).trim() : (defaults[key] || '');
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    content = content.replace(regex, value);
  });

  return { subject, content };
}

module.exports = {
  DEFAULT_SIGNUP_BUTTON_LABEL,
  buildInvitationTemplateVariables,
  buildSignupUrl,
  buildSignupUrlButtonHtml,
  buildSignupUrlButtonTableHtml,
  escapeHtml,
  renderTemplate,
};

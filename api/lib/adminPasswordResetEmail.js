function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PLAIN_LINK_MARKER = 'copy and paste this link into your browser';

/**
 * Admin reset emails use a single-use URL (no OTP). DB templates historically
 * only included a button link, which breaks when Mimecast rewrites/blocks links.
 */
function enrichAdminPasswordResetEmailHtml(htmlContent, resetUrl) {
  let html = String(htmlContent || '');

  html = html.replace(/expires in 1 hour/gi, 'expires in 48 hours');
  html = html.replace(/expire in 1 hour/gi, 'expire in 48 hours');
  html = html.replace(/expires in 24 hours/gi, 'expires in 48 hours');
  html = html.replace(/expire in 24 hours/gi, 'expire in 48 hours');

  if (html.toLowerCase().includes(PLAIN_LINK_MARKER)) {
    return html;
  }

  const safeUrl = escapeHtml(resetUrl);
  const fallbackBlock = `
<p>If the button doesn't work (for example, company email security such as Mimecast blocks the link), copy and paste this link into your browser:</p>
<p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #F3F4F6; padding: 12px; border-radius: 4px;">${safeUrl}</p>`;

  const buttonPatterns = [
    /<p><a href="[^"]*"[^>]*>\s*Reset Password\s*<\/a><\/p>/i,
    /<p><a href="[^"]*"[^>]*>\s*Reset Your Password\s*<\/a><\/p>/i,
  ];

  for (const pattern of buttonPatterns) {
    const match = html.match(pattern);
    if (match) {
      const insertAt = html.indexOf(match[0]) + match[0].length;
      return `${html.slice(0, insertAt)}${fallbackBlock}${html.slice(insertAt)}`;
    }
  }

  return `${html}${fallbackBlock}`;
}

module.exports = {
  enrichAdminPasswordResetEmailHtml,
};

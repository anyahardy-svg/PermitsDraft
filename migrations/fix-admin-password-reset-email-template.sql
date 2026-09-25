-- Admin password reset emails: add plain reset URL for Mimecast / link-protection bypass
-- and align expiry copy with server-side token lifetime (48 hours).

UPDATE email_templates
SET
  html_content = REPLACE(
    html_content,
    '<p><a href="{{resetUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset Password</a></p>
<p>This link will expire in 1 hour. If you didn''t request this, please ignore this email.</p>',
    '<p><a href="{{resetUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset Password</a></p>
<p>If the button doesn''t work (for example, company email security such as Mimecast blocks the link), copy and paste this link into your browser:</p>
<p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #F3F4F6; padding: 12px; border-radius: 4px;">{{resetUrl}}</p>
<p style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; font-size: 13px;">
  <strong>Security Note:</strong> This link expires in 48 hours. Never share this link with anyone.
</p>
<p>If you didn''t request this, please ignore this email.</p>'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'admin-password-reset'
  AND html_content LIKE '%href="{{resetUrl}}"%'
  AND html_content NOT LIKE '%copy and paste this link into your browser%';

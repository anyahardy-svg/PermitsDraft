-- Fix supplier invitation email template links
-- Ensures invite links use the main app URL (contractorhq.co.nz/supplier-form) instead of kiosk subdomains

UPDATE email_templates
SET
  html_content = REPLACE(
    REPLACE(html_content, '-kiosk.contractorhq.co.nz', 'contractorhq.co.nz'),
    '/supplier-accreditation?',
    '/supplier-form?'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'supplier-invitation'
  AND (
    html_content LIKE '%-kiosk.contractorhq.co.nz%'
    OR html_content LIKE '%/supplier-accreditation?%'
  );

-- Add plain-text form URL fallback when the stored template only has the button link
UPDATE email_templates
SET
  html_content = REPLACE(
    html_content,
    '<p><a href="{{formUrl}}" style="background-color: #0284C7; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Complete Supplier Accreditation</a></p>
<p style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; font-size: 13px;">',
    '<p><a href="{{formUrl}}" style="background-color: #0284C7; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Complete Supplier Accreditation</a></p>
<p>If the button doesn''t work, copy and paste this link into your browser:</p>
<p style="word-break: break-all; font-family: monospace; font-size: 12px; background-color: #F3F4F6; padding: 12px; border-radius: 4px;">{{formUrl}}</p>
<p style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; font-size: 13px;">'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'supplier-invitation'
  AND html_content LIKE '%href="{{formUrl}}"%'
  AND html_content NOT LIKE '%copy and paste this link into your browser%';

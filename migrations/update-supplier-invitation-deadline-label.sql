-- Update supplier invitation email template deadline label

UPDATE email_templates
SET
  html_content = REPLACE(html_content, '<strong>Deadline:</strong>', '<strong>Submit form deadline:</strong>'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'supplier-invitation'
  AND html_content LIKE '%<strong>Deadline:</strong>%';

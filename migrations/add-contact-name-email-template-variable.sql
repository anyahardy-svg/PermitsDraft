-- Add contactName variable to invitation email template
-- Use {{contactName}} in templates (e.g. "Dear {{contactName}},").
-- When no contact name is set on the company, it defaults to "Contractor".

UPDATE email_templates
SET
  html_content = REPLACE(html_content, '<p>Hello,</p>', '<p>Dear {{contactName}},</p>'),
  variables = (
    SELECT jsonb_agg(DISTINCT value)
    FROM (
      SELECT jsonb_array_elements_text(COALESCE(variables, '[]'::jsonb)) AS value
      UNION ALL
      SELECT 'contactName'
    ) AS merged
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'invitation'
  AND NOT COALESCE(variables, '[]'::jsonb) @> '["contactName"]'::jsonb;

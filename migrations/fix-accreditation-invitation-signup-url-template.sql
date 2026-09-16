-- Fix accreditation invitation templates that use {{signupUrl}} without an anchor tag.
-- {{signupUrl}} is the URL only; templates must use href="{{signupUrl}}" or {{signupUrlButton}}.

UPDATE email_templates
SET
  html_content = regexp_replace(
    html_content,
    '\{\{signupUrl\}\}(\s*)([^<]+?)(\s*)</a>',
    '<a href="{{signupUrl}}" style="background-color: #3B82F6; color: white; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 6px; display: inline-block;">\2</a>',
    'g'
  ),
  variables = (
    SELECT jsonb_agg(DISTINCT value)
    FROM (
      SELECT jsonb_array_elements_text(COALESCE(variables, '[]'::jsonb)) AS value
      UNION ALL
      SELECT 'signupUrlButton'
      UNION ALL
      SELECT 'signupUrlButtonTable'
    ) AS merged
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE type IN ('invitation', 'invitation-reminder')
  AND html_content ~ '\{\{signupUrl\}\}'
  AND html_content !~ 'href="\{\{signupUrl\}\}"';

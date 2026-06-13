import { ensureDefaultEmailTemplates } from './lib/ensureEmailTemplates.js';

/**
 * Ensures required email templates exist in the database.
 * Called from the Email Templates admin screen so admins can edit them without running SQL migrations.
 *
 * Usage: POST /api/ensure-email-templates
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await ensureDefaultEmailTemplates();
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('ensure-email-templates error:', error);
    return res.status(500).json({ error: error.message || 'Failed to ensure email templates' });
  }
}

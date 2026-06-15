/**
 * Backend endpoint to save supplier form data using the service role key.
 * Allows the admin panel (custom auth) to persist form drafts and updates.
 *
 * Usage: POST /api/save-supplier-accreditation
 * Body: { supplierId, formData, status? }
 */

import { saveSupplierFormData } from './lib/supplierFormStorage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { supplierId, formData, status = 'draft' } = req.body || {};

  if (!supplierId) {
    return res.status(400).json({ error: 'supplierId is required' });
  }

  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'formData is required' });
  }

  try {
    const saved = await saveSupplierFormData(supplierId, formData, status);
    return res.status(200).json(saved);
  } catch (error) {
    console.error('save-supplier-accreditation error:', error);
    const message = error.message || 'Failed to save supplier form data';

    if (message.includes('not configured on the server')) {
      return res.status(500).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}

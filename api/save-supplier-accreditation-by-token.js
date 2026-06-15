import { getSupplierByAccreditationToken } from './lib/supplierToken.js';
import { saveSupplierFormData } from './lib/supplierFormStorage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, formData, status = 'draft' } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'formData is required' });
  }

  try {
    const result = await getSupplierByAccreditationToken(token);

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const { supplier } = result;
    const saved = await saveSupplierFormData(supplier.id, formData, status);
    return res.status(200).json(saved);
  } catch (error) {
    console.error('save-supplier-accreditation-by-token error:', error);
    const message = error.message || 'Failed to save supplier form data';

    if (message.includes('not configured on the server')) {
      return res.status(500).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}

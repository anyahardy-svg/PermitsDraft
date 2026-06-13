import { getSupplierByAccreditationToken } from './lib/supplierToken.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query?.token;

  try {
    const result = await getSupplierByAccreditationToken(token);

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const { supplier } = result;

    return res.status(200).json({
      supplierId: supplier.id,
      companyName: supplier.company_name,
      deadline: supplier.accreditation_deadline,
      contactEmail: supplier.contact_email,
    });
  } catch (error) {
    console.error('validate-supplier-token error:', error);
    return res.status(500).json({ error: error.message || 'Failed to validate token' });
  }
}

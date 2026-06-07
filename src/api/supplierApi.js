import { supabase } from '../supabaseClient';

/**
 * Fetch all suppliers from the suppliers table.
 * Tries the server API first (service role bypasses RLS), then falls back to
 * a direct Supabase query once anon read policies are applied.
 * @returns {Promise<Array>}
 */
export async function getAllSuppliers() {
  if (typeof fetch !== 'undefined') {
    try {
      const response = await fetch('/api/list-suppliers');

      if (response.ok) {
        const suppliers = await response.json();
        if (Array.isArray(suppliers)) {
          return suppliers;
        }
      }
    } catch (apiError) {
      console.warn('Supplier list API unavailable, falling back to direct Supabase query:', apiError);
    }
  }

  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, company_name, risk_classification, status, created_at')
    .order('company_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Fetch the supplier accreditation record for a given supplier.
 * @param {string} supplierId
 * @returns {Promise<Object|null>}
 */
export async function getSupplierAccreditation(supplierId) {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }
  if (!supplierId) {
    throw new Error('Supplier ID is required');
  }

  const { data, error } = await supabase
    .from('supplier_accreditations')
    .select('*')
    .eq('supplier_id', supplierId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Upsert supplier accreditation form data into supplier_accreditations.
 * @param {string} supplierId
 * @param {Object} formData
 * @param {string} [status='draft']
 * @returns {Promise<Object>}
 */
export async function saveSupplierAccreditation(supplierId, formData, status = 'draft') {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }
  if (!supplierId) {
    throw new Error('Supplier ID is required');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('supplier_accreditations')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('submitted_by', user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const payload = {
    supplier_id: supplierId,
    accreditation_data: formData,
    status,
    submitted_by: user.id,
    ...(existing?.id ? { id: existing.id } : {}),
  };

  const { data, error } = await supabase
    .from('supplier_accreditations')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

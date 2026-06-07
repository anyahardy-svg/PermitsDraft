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
 * Fetch a single supplier by ID from the suppliers table.
 * @param {string} supplierId
 * @returns {Promise<Object|null>}
 */
export async function getSupplierById(supplierId) {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }
  if (!supplierId) {
    throw new Error('Supplier ID is required');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, company_name, risk_classification, status, created_at')
    .eq('id', supplierId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  if (typeof fetch !== 'undefined') {
    try {
      const response = await fetch('/api/list-suppliers');
      if (response.ok) {
        const suppliers = await response.json();
        if (Array.isArray(suppliers)) {
          return suppliers.find((supplier) => supplier.id === supplierId) || null;
        }
      }
    } catch (apiError) {
      console.warn('Supplier lookup API unavailable:', apiError);
    }
  }

  return null;
}

/**
 * Build default form values from a supplier record.
 * @param {Object|null} supplier
 * @returns {Object}
 */
export function getSupplierFormDefaults(supplier) {
  if (!supplier) {
    return {};
  }

  return {
    company_name: supplier.company_name || '',
    risk_classification: supplier.risk_classification || '',
  };
}

/**
 * Normalise accreditation_data from Supabase (JSONB object or string).
 * @param {unknown} accreditationData
 * @returns {Object}
 */
export function parseAccreditationData(accreditationData) {
  if (!accreditationData) {
    return {};
  }

  if (typeof accreditationData === 'string') {
    try {
      const parsed = JSON.parse(accreditationData);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof accreditationData === 'object') {
    return { ...accreditationData };
  }

  return {};
}

/**
 * Merge saved accreditation data with supplier table defaults.
 * Saved accreditation values always take precedence.
 * @param {Object|null} supplier
 * @param {Object|null} accreditationRecord
 * @returns {Object}
 */
export function buildSupplierFormData(supplier, accreditationRecord) {
  const savedData = parseAccreditationData(accreditationRecord?.accreditation_data);
  const defaults = getSupplierFormDefaults(supplier);

  return {
    ...defaults,
    ...savedData,
    company_name: savedData.company_name ?? defaults.company_name ?? '',
    risk_classification: savedData.risk_classification ?? defaults.risk_classification ?? '',
  };
}

/**
 * Fetch the supplier accreditation record for a given supplier.
 * @param {string} supplierId
 * @returns {Promise<Object|null>}
 */
export async function getSupplierAccreditation(supplierId) {
  if (!supplierId) {
    throw new Error('Supplier ID is required');
  }

  if (typeof fetch !== 'undefined') {
    try {
      const response = await fetch(
        `/api/get-supplier-accreditation?supplierId=${encodeURIComponent(supplierId)}`
      );

      if (response.ok) {
        const record = await response.json();
        if (record) {
          return record;
        }
      }
    } catch (apiError) {
      console.warn('Supplier accreditation API unavailable, falling back to direct Supabase query:', apiError);
    }
  }

  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await supabase
    .from('supplier_accreditations')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('updated_at', { ascending: false })
    .limit(1)
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
  if (!supplierId) {
    throw new Error('Supplier ID is required');
  }

  let apiErrorMessage = null;

  if (typeof fetch !== 'undefined') {
    try {
      const response = await fetch('/api/save-supplier-accreditation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierId,
          formData,
          status,
        }),
      });

      if (response.ok) {
        return response.json();
      }

      const errorBody = await response.json().catch(() => ({}));
      apiErrorMessage = errorBody.error || `Save API returned ${response.status}`;
      console.warn('Supplier accreditation save API failed:', apiErrorMessage);
    } catch (apiError) {
      apiErrorMessage = apiError.message || 'Save API unavailable';
      console.warn('Supplier accreditation save API unavailable:', apiError);
    }
  }

  if (!supabase) {
    throw new Error(
      apiErrorMessage ||
        'Supabase client is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server or run migrations/fix-suppliers-anon-read-rls.sql.'
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;

  let existingQuery = supabase
    .from('supplier_accreditations')
    .select('id, submitted_by')
    .eq('supplier_id', supplierId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (userId) {
    existingQuery = existingQuery.eq('submitted_by', userId);
  }

  const { data: existing, error: fetchError } = await existingQuery.maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('supplier_accreditations')
      .update({
        accreditation_data: formData,
        status,
      })
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(
        `${error.message}. Run migrations/fix-suppliers-anon-read-rls.sql in Supabase or configure SUPABASE_SERVICE_ROLE_KEY on the server.`
      );
    }

    if (data) {
      return data;
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from('supplier_accreditations')
      .select('*')
      .eq('id', existing.id)
      .maybeSingle();

    if (refreshError) {
      throw refreshError;
    }

    if (refreshed) {
      return refreshed;
    }

    throw new Error(
      'Save was blocked by database permissions. Run migrations/fix-suppliers-anon-read-rls.sql in Supabase or configure SUPABASE_SERVICE_ROLE_KEY on the server.'
    );
  }

  if (!userId) {
    throw new Error(
      apiErrorMessage ||
        'Unable to save supplier accreditation from the admin panel. Configure SUPABASE_SERVICE_ROLE_KEY on the server or run migrations/fix-suppliers-anon-read-rls.sql.'
    );
  }

  const { data, error } = await supabase
    .from('supplier_accreditations')
    .insert({
      supplier_id: supplierId,
      accreditation_data: formData,
      status,
      submitted_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

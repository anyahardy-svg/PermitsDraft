import { supabase } from '../supabaseClient';
import { sendSupplierInvitation } from './sendgrid';
import { createEmptyProduct } from '../schemas/supplierSchema';

const SUPPLIER_SELECT_FIELDS = [
  'id',
  'company_name',
  'company_email',
  'risk_classification',
  'status',
  'created_at',
  'contact_email',
  'tech_contact_name',
  'contact_phone',
  'nzbn',
  'address_1',
  'address_city',
  'address_postcode',
  'invitation_sent_at',
  'accreditation_deadline',
].join(', ');

const LEGACY_PRODUCT_FIELD_IDS = [
  'product_name',
  'product_type',
  'safety_docs',
  'test_each_batch',
  'aligned_standards',
  'standards_list',
  'coa_provided',
  'evidence_of_use',
  'affect_strength',
  'affect_set_time',
  'affect_durability',
  'affect_testing',
  'dosage_variance',
  'limitations_of_use',
  'complies_nz_standards',
  'hazard_classification',
  'third_party_certifications_details',
  'third_party_certifications_upload',
];

function hasLegacyProductFields(data) {
  return LEGACY_PRODUCT_FIELD_IDS.some((fieldId) => data[fieldId] !== undefined && data[fieldId] !== '');
}

function mergeSupplierContactName(firstName, surname) {
  const parts = [firstName, surname].map((part) => (part || '').trim()).filter(Boolean);
  return parts.join(' ');
}

function migrateLegacyFormData(savedData) {
  if (Array.isArray(savedData.products) && savedData.products.length) {
    return savedData;
  }

  if (!hasLegacyProductFields(savedData)) {
    return {
      ...savedData,
      products: [createEmptyProduct(0)],
    };
  }

  const migratedProduct = createEmptyProduct(0);
  LEGACY_PRODUCT_FIELD_IDS.forEach((fieldId) => {
    if (savedData[fieldId] !== undefined) {
      migratedProduct[fieldId] = savedData[fieldId];
    }
  });

  if (savedData.third_party_certifications_details || savedData.third_party_certifications_upload) {
    migratedProduct.certifications = {
      ...migratedProduct.certifications,
      other: {
        ...migratedProduct.certifications.other,
        enabled: Boolean(savedData.third_party_certifications_details || savedData.third_party_certifications_upload),
        otherLabel: savedData.third_party_certifications_details || '',
        url: savedData.third_party_certifications_upload?.url || '',
        fileName: savedData.third_party_certifications_upload?.fileName || '',
        uploadedAt: savedData.third_party_certifications_upload?.uploadedAt || '',
      },
    };
  }

  const nextData = { ...savedData, products: [migratedProduct] };
  LEGACY_PRODUCT_FIELD_IDS.forEach((fieldId) => {
    delete nextData[fieldId];
  });
  delete nextData.third_party_certifications_details;
  delete nextData.third_party_certifications_upload;

  return nextData;
}

async function attachAccreditationStatuses(suppliers = []) {
  if (!suppliers.length || !supabase) {
    return suppliers.map((supplier) => ({
      ...supplier,
      accreditation_status: supplier.accreditation_status || 'draft',
    }));
  }

  const supplierIds = suppliers.map((supplier) => supplier.id).filter(Boolean);
  if (!supplierIds.length) {
    return suppliers;
  }

  const { data: accreditationRecords, error } = await supabase
    .from('supplier_accreditations')
    .select('supplier_id, status, updated_at')
    .in('supplier_id', supplierIds)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Failed to load supplier accreditation statuses:', error);
    return suppliers.map((supplier) => ({
      ...supplier,
      accreditation_status: supplier.accreditation_status || 'draft',
    }));
  }

  const statusBySupplierId = {};
  for (const record of accreditationRecords || []) {
    if (!statusBySupplierId[record.supplier_id]) {
      statusBySupplierId[record.supplier_id] = record.status;
    }
  }

  return suppliers.map((supplier) => ({
    ...supplier,
    accreditation_status: statusBySupplierId[supplier.id] || supplier.accreditation_status || 'draft',
  }));
}

/**
 * Fetch all suppliers from the suppliers table.
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
    .select(SUPPLIER_SELECT_FIELDS)
    .order('company_name', { ascending: true });

  if (error) {
    throw error;
  }

  return attachAccreditationStatuses(data || []);
}

/**
 * Fetch a single supplier by ID from the suppliers table.
 */
export async function getSupplierById(supplierId) {
  if (!supplierId) {
    throw new Error('Supplier ID is required');
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('suppliers')
      .select(SUPPLIER_SELECT_FIELDS)
      .eq('id', supplierId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
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

  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  return null;
}

/**
 * Build default form values from a supplier record.
 */
export function getSupplierFormDefaults(supplier) {
  if (!supplier) {
    return {
      products: [createEmptyProduct(0)],
    };
  }

  return {
    company_name: supplier.company_name || '',
    company_email: supplier.company_email || supplier.contact_email || '',
    tech_contact_name: mergeSupplierContactName(supplier.tech_contact_name, supplier.contact_surname) || '',
    contact_email: supplier.contact_email || '',
    contact_phone: supplier.contact_phone || '',
    nzbn: supplier.nzbn || '',
    address_1: supplier.address_1 || '',
    address_city: supplier.address_city || '',
    address_postcode: supplier.address_postcode || '',
    risk_classification: supplier.risk_classification || '',
    products: [createEmptyProduct(0)],
  };
}

/**
 * Normalise accreditation_data from Supabase (JSONB object or string).
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
 */
export function buildSupplierFormData(supplier, accreditationRecord) {
  const savedData = migrateLegacyFormData(parseAccreditationData(accreditationRecord?.accreditation_data));
  const defaults = getSupplierFormDefaults(supplier);

  return {
    ...defaults,
    ...savedData,
    company_name: savedData.company_name ?? defaults.company_name ?? '',
    company_email: savedData.company_email ?? defaults.company_email ?? '',
    tech_contact_name: mergeSupplierContactName(
      savedData.tech_contact_name ?? defaults.tech_contact_name,
      savedData.contact_surname
    ) || '',
    contact_email: savedData.contact_email ?? defaults.contact_email ?? '',
    contact_phone: savedData.contact_phone ?? defaults.contact_phone ?? '',
    nzbn: savedData.nzbn ?? defaults.nzbn ?? '',
    address_1: savedData.address_1 ?? defaults.address_1 ?? '',
    address_city: savedData.address_city ?? defaults.address_city ?? '',
    address_postcode: savedData.address_postcode ?? defaults.address_postcode ?? '',
    risk_classification: savedData.risk_classification ?? defaults.risk_classification ?? '',
    products: Array.isArray(savedData.products) && savedData.products.length
      ? savedData.products
      : defaults.products,
  };
}

/**
 * Fetch the supplier accreditation record for a given supplier.
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
 * Load supplier accreditation using a public access token.
 */
export async function getSupplierAccreditationByToken(token) {
  if (!token) {
    throw new Error('Accreditation token is required');
  }

  const response = await fetch(
    `/api/get-supplier-accreditation-by-token?token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Invalid or expired accreditation link');
  }

  return response.json();
}

/**
 * Validate a supplier accreditation token.
 */
export async function validateSupplierToken(token) {
  const response = await fetch(
    `/api/validate-supplier-token?token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Invalid or expired accreditation link');
  }

  return response.json();
}

/**
 * Upsert supplier accreditation form data into supplier_accreditations.
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

/**
 * Save supplier accreditation using a public access token.
 */
export async function saveSupplierAccreditationByToken(token, formData, status = 'draft') {
  const response = await fetch('/api/save-supplier-accreditation-by-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      formData,
      status,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to save supplier accreditation');
  }

  return response.json();
}

/**
 * Upload a supplier document via token or admin supplier ID.
 */
export async function uploadSupplierDocument({
  file,
  documentType,
  token = null,
  supplierId = null,
}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  if (token) {
    formData.append('token', token);
  } else if (supplierId) {
    formData.append('supplierId', supplierId);
  } else {
    throw new Error('token or supplierId is required for document upload');
  }

  const response = await fetch('/api/upload-supplier-document', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to upload document');
  }

  return response.json();
}

/**
 * Create or update a supplier via the server API (service role).
 */
export async function createSupplier(supplierData) {
  if (!supplierData?.company_name?.trim()) {
    throw new Error('Company name is required');
  }

  const response = await fetch('/api/create-supplier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(supplierData),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to save supplier (${response.status})`);
  }

  return response.json();
}

/**
 * Create a supplier and send an accreditation invitation email.
 */
export async function inviteSupplier({
  companyName,
  email,
  riskClassification,
  deadline,
  techContactName,
}) {
  const supplier = await createSupplier({
    company_name: companyName,
    risk_classification: riskClassification,
    contact_email: email,
    tech_contact_name: techContactName,
    upsert: true,
  });

  const emailResult = await sendSupplierInvitation(
    email,
    companyName,
    deadline,
    supplier.id,
    techContactName
  );

  if (!emailResult.success) {
    return {
      supplier,
      emailSent: false,
      warning: emailResult.error || 'Supplier was created but the invitation email failed to send',
    };
  }

  return {
    supplier: {
      ...supplier,
      invitation_sent_at: new Date().toISOString(),
      accreditation_deadline: deadline ? new Date(deadline).toISOString().split('T')[0] : supplier.accreditation_deadline,
      contact_email: email,
    },
    emailSent: true,
  };
}

/**
 * Delete a supplier via the server API (service role).
 */
export async function deleteSupplier(supplierId) {
  if (!supplierId) {
    throw new Error('Supplier ID is required');
  }

  const response = await fetch('/api/delete-supplier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ supplierId }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to delete supplier (${response.status})`);
  }

  return response.json();
}

/**
 * Send an accreditation invitation to an existing supplier.
 */
export async function sendInvitationToSupplier({
  supplierId,
  email,
  companyName,
  deadline,
  techContactName,
}) {
  const emailResult = await sendSupplierInvitation(
    email,
    companyName,
    deadline,
    supplierId,
    techContactName
  );

  if (!emailResult.success) {
    throw new Error(emailResult.error || 'Failed to send invitation email');
  }

  return { emailSent: true };
}

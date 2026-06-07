import React, { useEffect, useState } from 'react';

import FormEngine from '../components/supplier/FormEngine.jsx';
import {
  buildSupplierFormData,
  getSupplierAccreditation,
  getSupplierById,
  saveSupplierAccreditation,
} from '../api/supplierApi';
import { supplierSchema } from '../schemas/supplierSchema';

const saveNoticeStyles = {
  banner: {
    marginBottom: '1rem',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 600,
    border: '1px solid transparent',
  },
  success: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
    color: '#065f46',
  },
  error: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    color: '#991b1b',
  },
};

export default function SupplierAccreditationScreen({ supplierId }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (saveNotice?.type !== 'success') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveNotice(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveNotice]);

  useEffect(() => {
    if (!supplierId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadAccreditation() {
      try {
        setLoading(true);
        const [supplier, record] = await Promise.all([
          getSupplierById(supplierId),
          getSupplierAccreditation(supplierId),
        ]);

        if (!cancelled) {
          setFormData(buildSupplierFormData(supplier, record));
        }
      } catch (error) {
        console.error('Failed to load supplier accreditation:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccreditation();

    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  const handleFieldChange = (fieldId, value) => {
    setFormData((previousFormData) => ({
      ...previousFormData,
      [fieldId]: value,
    }));
  };

  const handleSaveDraft = async () => {
    if (!supplierId) {
      return;
    }

    try {
      setSaving(true);
      setSaveNotice(null);
      await saveSupplierAccreditation(supplierId, formData, 'draft');
      setSaveNotice({
        type: 'success',
        message: 'Draft saved successfully.',
      });
    } catch (error) {
      console.error('Failed to save supplier accreditation draft:', error);
      setSaveNotice({
        type: 'error',
        message: error?.message || 'Failed to save draft. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="supplier-accreditation-screen">
      <h1>Supplier Accreditation</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <FormEngine
            schema={supplierSchema}
            formData={formData}
            onFieldChange={handleFieldChange}
          />

          {saveNotice && (
            <div
              role="status"
              aria-live="polite"
              style={{
                ...saveNoticeStyles.banner,
                ...(saveNotice.type === 'success'
                  ? saveNoticeStyles.success
                  : saveNoticeStyles.error),
              }}
            >
              {saveNotice.message}
            </div>
          )}

          <button type="button" onClick={handleSaveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </>
      )}
    </div>
  );
}

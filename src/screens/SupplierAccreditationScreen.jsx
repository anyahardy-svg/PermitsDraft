import React, { useEffect, useState } from 'react';

import FormEngine from '../components/supplier/FormEngine.jsx';
import {
  buildSupplierFormData,
  getSupplierAccreditation,
  getSupplierById,
  saveSupplierAccreditation,
} from '../api/supplierApi';
import { supplierSchema } from '../schemas/supplierSchema';

export default function SupplierAccreditationScreen({ supplierId }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState(null);
  const [saving, setSaving] = useState(false);

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
      setSaveMessage(null);
      await saveSupplierAccreditation(supplierId, formData, 'draft');
      setSaveMessage('Draft saved successfully.');
    } catch (error) {
      console.error('Failed to save supplier accreditation draft:', error);
      setSaveMessage(error?.message || 'Failed to save draft. Please try again.');
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

          <button type="button" onClick={handleSaveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {saveMessage && (
            <p style={{ marginTop: '1rem', color: saveMessage.includes('successfully') ? '#065f46' : '#dc2626' }}>
              {saveMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}

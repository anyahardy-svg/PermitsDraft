import React, { useCallback, useEffect, useMemo, useState } from 'react';

import FormEngine from '../components/supplier/FormEngine.jsx';
import {
  buildSupplierFormData,
  getSupplierAccreditation,
  getSupplierAccreditationByToken,
  getSupplierById,
  saveSupplierAccreditation,
  saveSupplierAccreditationByToken,
  uploadSupplierDocument,
} from '../api/supplierApi';
import { supplierSchema } from '../schemas/supplierSchema';

const screenStyles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '0 0 2rem 0',
  },
  header: {
    marginBottom: '1.25rem',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: 0,
    color: '#4B5563',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  deadline: {
    marginTop: '0.75rem',
    display: 'inline-block',
    padding: '0.5rem 0.75rem',
    borderRadius: '999px',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    alignItems: 'center',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #E5E7EB',
  },
  statusBadge: (tone) => ({
    padding: '0.5rem 0.875rem',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.875rem',
    backgroundColor: tone === 'success' ? '#D1FAE5' : '#FEF3C7',
    color: tone === 'success' ? '#065F46' : '#92400E',
  }),
  primaryButton: {
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.25rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.25rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  notice: (type) => ({
    marginBottom: '1rem',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 600,
    border: '1px solid transparent',
    backgroundColor: type === 'success' ? '#ECFDF5' : type === 'error' ? '#FEF2F2' : '#EFF6FF',
    borderColor: type === 'success' ? '#6EE7B7' : type === 'error' ? '#FECACA' : '#BFDBFE',
    color: type === 'success' ? '#065F46' : type === 'error' ? '#991B1B' : '#1D4ED8',
  }),
  errorPanel: {
    padding: '1.5rem',
    borderRadius: '8px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#991B1B',
  },
};

function formatDeadline(deadline) {
  if (!deadline) {
    return null;
  }

  try {
    return new Date(deadline).toLocaleDateString('en-NZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return deadline;
  }
}

export default function SupplierAccreditationScreen({
  supplierId = null,
  token = null,
  isPublic = false,
  userRole = isPublic ? 'supplier' : 'admin',
}) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [meta, setMeta] = useState({
    companyName: '',
    deadline: null,
    status: 'draft',
  });

  const resolvedUserRole = isPublic ? 'supplier' : userRole;

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
    let cancelled = false;

    async function loadAccreditation() {
      if (!supplierId && !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);

        if (token) {
          const payload = await getSupplierAccreditationByToken(token);
          if (!cancelled) {
            setFormData(buildSupplierFormData(payload.supplier, payload.accreditation));
            setMeta({
              companyName: payload.supplier?.company_name || '',
              deadline: payload.supplier?.accreditation_deadline || null,
              status: payload.accreditation?.status || 'draft',
            });
          }
          return;
        }

        const [supplier, record] = await Promise.all([
          getSupplierById(supplierId),
          getSupplierAccreditation(supplierId),
        ]);

        if (!cancelled) {
          setFormData(buildSupplierFormData(supplier, record));
          setMeta({
            companyName: supplier?.company_name || '',
            deadline: supplier?.accreditation_deadline || null,
            status: record?.status || 'draft',
          });
        }
      } catch (error) {
        console.error('Failed to load supplier accreditation:', error);
        if (!cancelled) {
          setLoadError(error?.message || 'Failed to load supplier accreditation form.');
        }
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
  }, [supplierId, token]);

  const uploadHandler = useCallback(async (file, documentType) => {
    return uploadSupplierDocument({
      file,
      documentType,
      token: token || null,
      supplierId: supplierId || null,
    });
  }, [token, supplierId]);

  const persistForm = async (status) => {
    if (token) {
      return saveSupplierAccreditationByToken(token, formData, status);
    }

    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    return saveSupplierAccreditation(supplierId, formData, status);
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData((previousFormData) => ({
      ...previousFormData,
      [fieldId]: value,
    }));
  };

  const handleProductsChange = (products) => {
    setFormData((previousFormData) => ({
      ...previousFormData,
      products,
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setSaveNotice(null);
      const saved = await persistForm('draft');
      setMeta((previous) => ({
        ...previous,
        status: saved?.status || 'draft',
      }));
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

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setSaveNotice(null);
      const saved = await persistForm('reviewing');
      setMeta((previous) => ({
        ...previous,
        status: saved?.status || 'reviewing',
      }));
      setSaveNotice({
        type: 'success',
        message: 'Thank you. Your supplier accreditation has been submitted for review.',
      });
    } catch (error) {
      console.error('Failed to submit supplier accreditation:', error);
      setSaveNotice({
        type: 'error',
        message: error?.message || 'Failed to submit accreditation. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deadlineLabel = useMemo(() => formatDeadline(meta.deadline), [meta.deadline]);
  const isSubmitted = meta.status === 'reviewing' || meta.status === 'approved';

  if (loading) {
    return (
      <div style={screenStyles.container} className="supplier-accreditation-screen">
        <p>Loading supplier accreditation form...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={screenStyles.container} className="supplier-accreditation-screen">
        <div style={screenStyles.errorPanel}>
          <h2 style={{ marginTop: 0 }}>Unable to open form</h2>
          <p style={{ marginBottom: 0 }}>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={screenStyles.container} className="supplier-accreditation-screen">
      <div style={screenStyles.header}>
        <h1 style={screenStyles.title}>Supplier Accreditation</h1>
        <p style={screenStyles.subtitle}>
          {isPublic
            ? `Please complete the supplier and product information for ${meta.companyName || 'your organisation'}.`
            : `Review and manage the supplier accreditation questionnaire for ${meta.companyName || 'this supplier'}.`}
        </p>
        {deadlineLabel && (
          <span style={screenStyles.deadline}>Deadline: {deadlineLabel}</span>
        )}
      </div>

      {saveNotice && (
        <div
          role="status"
          aria-live="polite"
          style={screenStyles.notice(saveNotice.type)}
        >
          {saveNotice.message}
        </div>
      )}

      <FormEngine
        schema={supplierSchema}
        formData={formData}
        onFieldChange={handleFieldChange}
        onProductsChange={handleProductsChange}
        userRole={resolvedUserRole}
        uploadHandler={uploadHandler}
      />

      <div style={screenStyles.footer}>
        <span style={screenStyles.statusBadge(isSubmitted ? 'success' : 'draft')}>
          {isSubmitted ? 'Submitted for review' : 'In progress'}
        </span>

        <button
          type="button"
          style={{
            ...screenStyles.primaryButton,
            ...(saving ? screenStyles.disabledButton : {}),
          }}
          onClick={handleSaveDraft}
          disabled={saving || submitting}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>

        {isPublic && (
          <button
            type="button"
            style={{
              ...screenStyles.secondaryButton,
              ...((submitting || isSubmitted) ? screenStyles.disabledButton : {}),
            }}
            onClick={handleSubmit}
            disabled={submitting || isSubmitted}
          >
            {submitting ? 'Submitting...' : isSubmitted ? 'Submitted' : 'Submit as Complete'}
          </button>
        )}
      </div>
    </div>
  );
}

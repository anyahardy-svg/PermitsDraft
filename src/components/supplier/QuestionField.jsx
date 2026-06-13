import React, { useRef, useState } from 'react';
import { SUPPLIER_CERTIFICATIONS } from '../../schemas/supplierSchema';

const fieldStyles = {
  wrapper: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: '#1f2937',
    fontSize: '0.95rem',
  },
  required: {
    color: '#dc2626',
    marginLeft: '0.25rem',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  optionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  yesNoGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  yesNoButton: (active, tone) => ({
    border: 'none',
    borderRadius: '999px',
    padding: '0.5rem 1rem',
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: active ? (tone === 'yes' ? '#10B981' : '#EF4444') : '#E5E7EB',
    color: active ? '#FFFFFF' : '#374151',
  }),
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
  },
  uploaded: {
    padding: '0.625rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    fontSize: '0.875rem',
  },
  uploadButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  certCard: {
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '0.75rem',
    backgroundColor: '#FFFFFF',
  },
  certHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  placeholder: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '1px dashed #9ca3af',
    borderRadius: '6px',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  unknown: {
    padding: '0.75rem 1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#991b1b',
    fontSize: '0.875rem',
  },
};

function CheckboxList({ field, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div style={fieldStyles.optionGroup}>
      {(field.options || []).map((option) => (
        <label key={option} style={fieldStyles.optionRow}>
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => toggleOption(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function YesNoField({ fieldId, value, onChange }) {
  return (
    <div style={fieldStyles.yesNoGroup} role="radiogroup" aria-labelledby={fieldId}>
      {['yes', 'no'].map((option) => (
        <button
          key={option}
          type="button"
          style={fieldStyles.yesNoButton(value === option, option)}
          onClick={() => onChange(option)}
        >
          {option === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

function DocumentUploadField({ field, value, onChange, uploadHandler }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !uploadHandler) {
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const uploaded = await uploadHandler(file, field.id);
      onChange({
        ...(value && typeof value === 'object' ? value : {}),
        url: uploaded.url,
        path: uploaded.path,
        uploadedAt: uploaded.uploadedAt,
        fileName: file.name,
      });
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  if (!uploadHandler) {
    return (
      <div style={fieldStyles.placeholder}>
        Document upload for &ldquo;{field.label}&rdquo; will be available once the form link is opened from your invitation email.
      </div>
    );
  }

  return (
    <div style={fieldStyles.uploadBox}>
      {value?.url ? (
        <div style={fieldStyles.uploaded}>
          Uploaded: {value.fileName || 'Document'}{' '}
          <a href={value.url} target="_blank" rel="noreferrer">View</a>
        </div>
      ) : (
        <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>No document uploaded yet.</span>
      )}
      <button
        type="button"
        style={fieldStyles.uploadButton}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : value?.url ? 'Replace document' : 'Upload document'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      {error && <div style={{ color: '#B91C1C', fontSize: '0.875rem' }}>{error}</div>}
    </div>
  );
}

function DocumentGroupField({ field, value, onChange, uploadHandler }) {
  const docs = value && typeof value === 'object' ? value : {};

  const updateDoc = (option, docValue) => {
    onChange({
      ...docs,
      [option]: docValue,
    });
  };

  return (
    <div style={fieldStyles.optionGroup}>
      {(field.options || []).map((option) => (
        <div key={option} style={fieldStyles.uploadBox}>
          <strong>{option}</strong>
          <DocumentUploadField
            field={{ ...field, id: `${field.id}_${option}`, label: option }}
            value={docs[option] || null}
            onChange={(docValue) => updateDoc(option, docValue)}
            uploadHandler={uploadHandler
              ? (file) => uploadHandler(file, `${field.id}_${option}`)
              : null}
          />
        </div>
      ))}
    </div>
  );
}

function CertificationListField({ field, value, onChange, uploadHandler }) {
  const certifications = value && typeof value === 'object' ? value : {};

  const updateCertification = (key, patch) => {
    onChange({
      ...certifications,
      [key]: {
        ...(certifications[key] || {}),
        ...patch,
      },
    });
  };

  return (
    <div>
      {SUPPLIER_CERTIFICATIONS.map((certification) => {
        const certValue = certifications[certification.key] || {};
        const enabled = Boolean(certValue.enabled);

        return (
          <div key={certification.key} style={fieldStyles.certCard}>
            <label style={fieldStyles.certHeader}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => updateCertification(certification.key, { enabled: event.target.checked })}
              />
              <span>{certification.label}</span>
            </label>

            {enabled && (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {certification.key === 'other' && (
                  <input
                    type="text"
                    style={fieldStyles.input}
                    placeholder="Certification name"
                    value={certValue.otherLabel || ''}
                    onChange={(event) => updateCertification(certification.key, { otherLabel: event.target.value })}
                  />
                )}
                <input
                  type="date"
                  style={fieldStyles.input}
                  value={certValue.expiry || ''}
                  onChange={(event) => updateCertification(certification.key, { expiry: event.target.value })}
                />
                <DocumentUploadField
                  field={{ ...field, id: `${field.id}_${certification.key}`, label: certification.label }}
                  value={certValue.url ? { url: certValue.url, fileName: certValue.fileName, uploadedAt: certValue.uploadedAt } : null}
                  onChange={(uploaded) => updateCertification(certification.key, {
                    url: uploaded?.url || '',
                    fileName: uploaded?.fileName || '',
                    uploadedAt: uploaded?.uploadedAt || '',
                  })}
                  uploadHandler={uploadHandler
                    ? (file) => uploadHandler(file, `cert_${certification.key}`)
                    : null}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function QuestionField({ field, value, onChange, uploadHandler = null }) {
  const renderControl = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        if (field.multiline) {
          return (
            <textarea
              id={field.id}
              style={fieldStyles.textarea}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.required}
            />
          );
        }
        return (
          <input
            id={field.id}
            type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
            style={fieldStyles.input}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            style={fieldStyles.select}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            <option value="">Select an option</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'yes_no':
        return <YesNoField fieldId={field.id} value={value} onChange={onChange} />;

      case 'checkbox-list':
        return <CheckboxList field={field} value={value} onChange={onChange} />;

      case 'document-group':
        return (
          <DocumentGroupField
            field={field}
            value={value}
            onChange={onChange}
            uploadHandler={uploadHandler}
          />
        );

      case 'document-evidence':
        return (
          <DocumentUploadField
            field={field}
            value={value}
            onChange={onChange}
            uploadHandler={uploadHandler}
          />
        );

      case 'certification-list':
        return (
          <CertificationListField
            field={field}
            value={value}
            onChange={onChange}
            uploadHandler={uploadHandler}
          />
        );

      case 'signature-pad':
        return (
          <div style={fieldStyles.placeholder}>
            Signature pad for &ldquo;{field.label}&rdquo; — coming soon.
          </div>
        );

      default:
        return (
          <div style={fieldStyles.unknown}>
            Unsupported field type: {field.type}
          </div>
        );
    }
  };

  return (
    <div style={fieldStyles.wrapper} className="question-field">
      <label htmlFor={field.id} style={fieldStyles.label}>
        {field.label}
        {field.required && <span style={fieldStyles.required}>*</span>}
      </label>
      {renderControl()}
    </div>
  );
}

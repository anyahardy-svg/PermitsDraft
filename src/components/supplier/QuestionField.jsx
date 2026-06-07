import React from 'react';

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
  radioGroup: {
    display: 'flex',
    gap: '1.5rem',
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
    <div style={fieldStyles.radioGroup} role="radiogroup" aria-labelledby={fieldId}>
      {['yes', 'no'].map((option) => (
        <label key={option} style={fieldStyles.optionRow}>
          <input
            type="radio"
            name={fieldId}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span style={{ textTransform: 'capitalize' }}>{option}</span>
        </label>
      ))}
    </div>
  );
}

export default function QuestionField({ field, value, onChange }) {
  const renderControl = () => {
    switch (field.type) {
      case 'text':
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
            type="text"
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
      case 'document-group':
        return <CheckboxList field={field} value={value} onChange={onChange} />;

      case 'document-evidence':
        return (
          <div style={fieldStyles.placeholder}>
            Document upload for &ldquo;{field.label}&rdquo; — coming soon.
          </div>
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

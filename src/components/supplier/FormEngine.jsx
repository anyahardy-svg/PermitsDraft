import React from 'react';
import QuestionField from './QuestionField';

const engineStyles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    backgroundColor: '#fff',
  },
  sectionTitle: {
    margin: '0 0 1.25rem 0',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#111827',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '0.75rem',
  },
};

const USER_ROLE = 'supplier';

function isVisible(item, formData) {
  if (typeof item.visibleWhen !== 'function') {
    return true;
  }
  return item.visibleWhen(formData, USER_ROLE);
}

export default function FormEngine({ schema, formData, onFieldChange }) {
  if (!schema?.sections?.length) {
    return null;
  }

  return (
    <div style={engineStyles.form} className="form-engine">
      {schema.sections.map((section) => {
        if (!isVisible(section, formData)) {
          return null;
        }

        return (
          <section
            key={section.id}
            style={engineStyles.section}
            className="form-engine-section"
            data-section-id={section.id}
          >
            <h2 style={engineStyles.sectionTitle}>{section.title}</h2>

            {(section.fields || []).map((field) => {
              if (!isVisible(field, formData)) {
                return null;
              }

              return (
                <QuestionField
                  key={field.id}
                  field={field}
                  value={formData?.[field.id]}
                  onChange={(newValue) => onFieldChange(field.id, newValue)}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

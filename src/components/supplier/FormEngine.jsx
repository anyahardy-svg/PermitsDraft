import React, { useEffect, useMemo, useState } from 'react';
import QuestionField from './QuestionField';
import { createEmptyProduct } from '../../schemas/supplierSchema';

const engineStyles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: '#F9FAFB',
  },
  basicsCard: {
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '1.25rem',
    backgroundColor: '#F9FAFB',
  },
  basicsTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#1F2937',
  },
  basicsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '0.75rem 1rem',
  },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    backgroundColor: '#F0F9FF',
    border: '2px solid #0284C7',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#0284C7',
  },
  sectionToggle: {
    color: '#0284C7',
    fontWeight: 700,
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  sectionContent: {
    marginTop: '0.75rem',
    padding: '1rem',
    backgroundColor: '#FAFAFA',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
  },
  productCard: {
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    backgroundColor: '#FFFFFF',
  },
  productHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    gap: '0.75rem',
  },
  productTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1F2937',
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    padding: '0.375rem 0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

function isVisible(item, formData, userRole) {
  if (typeof item.visibleWhen !== 'function') {
    return true;
  }
  return item.visibleWhen(formData, userRole);
}

function getExpandedStorageKey(userRole) {
  return `supplier-accreditation-expanded-${userRole}`;
}

function loadExpandedSections(userRole, sectionIds) {
  if (typeof window === 'undefined') {
    return Object.fromEntries(sectionIds.map((id) => [id, true]));
  }

  try {
    const stored = window.localStorage.getItem(getExpandedStorageKey(userRole));
    if (!stored) {
      return Object.fromEntries(sectionIds.map((id) => [id, true]));
    }
    const parsed = JSON.parse(stored);
    return Object.fromEntries(sectionIds.map((id) => [id, parsed[id] !== false]));
  } catch {
    return Object.fromEntries(sectionIds.map((id) => [id, true]));
  }
}

function BasicsSection({ section, formData, onFieldChange, userRole }) {
  const visibleFields = (section.fields || []).filter((field) => isVisible(field, formData, userRole));

  return (
    <section style={engineStyles.basicsCard} className="form-engine-basics">
      <h2 style={engineStyles.basicsTitle}>{section.title}</h2>
      <div style={engineStyles.basicsGrid}>
        {visibleFields.map((field) => (
          <QuestionField
            key={field.id}
            field={field}
            value={formData?.[field.id]}
            onChange={(newValue) => onFieldChange(field.id, newValue)}
            uploadHandler={null}
          />
        ))}
      </div>
    </section>
  );
}

function RepeatableGroupSection({
  section,
  products,
  onProductsChange,
  userRole,
  uploadHandler,
}) {
  const updateProductField = (index, fieldId, value) => {
    const nextProducts = products.map((product, productIndex) => (
      productIndex === index ? { ...product, [fieldId]: value } : product
    ));
    onProductsChange(nextProducts);
  };

  const addProduct = () => {
    onProductsChange([...products, createEmptyProduct(products.length)]);
  };

  const removeProduct = (index) => {
    if (products.length <= 1) {
      return;
    }
    onProductsChange(products.filter((_, productIndex) => productIndex !== index));
  };

  return (
    <div>
      {products.map((product, index) => (
        <div key={product.id || `product-${index}`} style={engineStyles.productCard}>
          <div style={engineStyles.productHeader}>
            <h3 style={engineStyles.productTitle}>
              {section.itemLabel || 'Item'} {index + 1}
              {product.product_name ? `: ${product.product_name}` : ''}
            </h3>
            {products.length > 1 && (
              <button type="button" style={engineStyles.removeButton} onClick={() => removeProduct(index)}>
                Remove
              </button>
            )}
          </div>

          {(section.fields || []).map((field) => {
            if (!isVisible(field, product, userRole)) {
              return null;
            }

            return (
              <QuestionField
                key={`${product.id || index}-${field.id}`}
                field={field}
                value={product?.[field.id]}
                onChange={(newValue) => updateProductField(index, field.id, newValue)}
                uploadHandler={uploadHandler
                  ? (file, documentType) => uploadHandler(file, documentType, index, field.id)
                  : null}
              />
            );
          })}
        </div>
      ))}

      <button type="button" style={engineStyles.addButton} onClick={addProduct}>
        {section.addLabel || 'Add item'}
      </button>
    </div>
  );
}

function AccordionSection({ section, expanded, onToggle, children }) {
  return (
    <section className="form-engine-section" data-section-id={section.id}>
      <button type="button" style={engineStyles.sectionHeader} onClick={onToggle}>
        <h2 style={engineStyles.sectionTitle}>{section.title}</h2>
        <span style={engineStyles.sectionToggle}>{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && <div style={engineStyles.sectionContent}>{children}</div>}
    </section>
  );
}

export default function FormEngine({
  schema,
  formData,
  onFieldChange,
  onProductsChange,
  userRole = 'supplier',
  uploadHandler = null,
}) {
  const sectionIds = useMemo(
    () => (schema?.sections || []).map((section) => section.id),
    [schema]
  );

  const [expandedSections, setExpandedSections] = useState(() => loadExpandedSections(userRole, sectionIds));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(getExpandedStorageKey(userRole), JSON.stringify(expandedSections));
  }, [expandedSections, userRole]);

  if (!schema) {
    return null;
  }

  const products = Array.isArray(formData?.products) && formData.products.length
    ? formData.products
    : [createEmptyProduct(0)];

  const toggleSection = (sectionId) => {
    setExpandedSections((previous) => ({
      ...previous,
      [sectionId]: !previous[sectionId],
    }));
  };

  return (
    <div style={engineStyles.page} className="form-engine">
      {schema.basicsSection && (
        <BasicsSection
          section={schema.basicsSection}
          formData={formData}
          onFieldChange={onFieldChange}
          userRole={userRole}
        />
      )}

      {(schema.sections || []).map((section) => {
        if (!isVisible(section, formData, userRole)) {
          return null;
        }

        const expanded = expandedSections[section.id] !== false;

        if (section.type === 'repeatable-group') {
          return (
            <AccordionSection
              key={section.id}
              section={section}
              expanded={expanded}
              onToggle={() => toggleSection(section.id)}
            >
              <RepeatableGroupSection
                section={section}
                products={products}
                onProductsChange={onProductsChange}
                userRole={userRole}
                uploadHandler={uploadHandler}
              />
            </AccordionSection>
          );
        }

        return (
          <AccordionSection
            key={section.id}
            section={section}
            expanded={expanded}
            onToggle={() => toggleSection(section.id)}
          >
            {(section.fields || []).map((field) => {
              if (!isVisible(field, formData, userRole)) {
                return null;
              }

              return (
                <QuestionField
                  key={field.id}
                  field={field}
                  value={formData?.[field.id]}
                  onChange={(newValue) => onFieldChange(field.id, newValue)}
                  uploadHandler={uploadHandler
                    ? (file, documentType) => uploadHandler(file, documentType, null, field.id)
                    : null}
                />
              );
            })}
          </AccordionSection>
        );
      })}
    </div>
  );
}

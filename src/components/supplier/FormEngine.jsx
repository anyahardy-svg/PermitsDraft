import React, { useEffect, useMemo, useState } from 'react';
import QuestionField from './QuestionField';
import { createEmptyProduct } from '../../schemas/supplierSchema';

const engineStyles = {
  page: {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F9FAFB',
  },
  basicsCard: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: '#F9FAFB',
  },
  basicsTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 700,
    color: '#1F2937',
  },
  basicsFields: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  sectionsWrap: {
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: '12px',
    paddingBottom: '12px',
  },
  sectionHeader: {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '14px',
    backgroundColor: '#F0F9FF',
    border: '2px solid #0284C7',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: '12px',
    marginTop: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#0284C7',
  },
  sectionToggle: {
    color: '#0284C7',
    fontWeight: 700,
    fontSize: '18px',
    flexShrink: 0,
  },
  sectionContent: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: '#FAFAFA',
    borderRadius: '8px',
  },
  productCard: {
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    padding: '12px',
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
    fontSize: '18px',
    fontWeight: 700,
    color: '#1F2937',
  },
  addButton: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 16px',
    fontWeight: 600,
    fontSize: '16px',
    cursor: 'pointer',
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
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
      <div style={engineStyles.basicsFields}>
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

function AccordionSection({ section, expanded, onToggle, children, isFirst }) {
  return (
    <section className="form-engine-section" data-section-id={section.id}>
      <button
        type="button"
        style={{
          ...engineStyles.sectionHeader,
          marginTop: isFirst ? 0 : '16px',
        }}
        onClick={onToggle}
      >
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

  const visibleSections = (schema.sections || []).filter((section) => isVisible(section, formData, userRole));

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

      <div style={engineStyles.sectionsWrap}>
        {visibleSections.map((section, index) => {
          const expanded = expandedSections[section.id] !== false;

          if (section.type === 'repeatable-group') {
            return (
              <AccordionSection
                key={section.id}
                section={section}
                expanded={expanded}
                onToggle={() => toggleSection(section.id)}
                isFirst={index === 0}
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
              isFirst={index === 0}
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
    </div>
  );
}

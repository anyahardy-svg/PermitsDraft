export const SUPPLIER_CERTIFICATIONS = [
  { key: 'iso_9001', label: 'ISO 9001 (Quality Management)' },
  { key: 'iso_14001', label: 'ISO 14001 (Environmental Management)' },
  { key: 'as_nzs_compliance', label: 'AS/NZS Product Compliance' },
  { key: 'ce_marking', label: 'CE Marking' },
  { key: 'nz_environmental_choice', label: 'Environmental Choice New Zealand' },
  { key: 'other', label: 'Other' },
];

export function createEmptyCertificationState() {
  return SUPPLIER_CERTIFICATIONS.reduce((accumulator, certification) => {
    accumulator[certification.key] = {
      enabled: false,
      expiry: '',
      url: '',
      otherLabel: certification.key === 'other' ? '' : undefined,
    };
    return accumulator;
  }, {});
}

export function createEmptyProduct(index = 0) {
  return {
    id: `product-${Date.now()}-${index}`,
    product_name: '',
    product_type: [],
    safety_docs: {},
    test_each_batch: '',
    aligned_standards: '',
    standards_list: '',
    coa_provided: null,
    evidence_of_use: [],
    affect_strength: '',
    affect_set_time: '',
    affect_durability: '',
    affect_testing: '',
    dosage_variance: '',
    limitations_of_use: '',
    complies_nz_standards: '',
    hazard_classification: '',
    certifications: createEmptyCertificationState(),
  };
}

export const supplierSchema = {
  basicsSection: {
    id: 'supplier_basics',
    title: 'Supplier & Contact Information',
    fields: [
      { id: 'company_name', label: 'Company Name', type: 'text', required: true },
      { id: 'company_email', label: 'Company Email', type: 'email' },
      { id: 'tech_contact_name', label: 'Primary Contact Name', type: 'text' },
      { id: 'contact_surname', label: 'Primary Contact Surname', type: 'text' },
      { id: 'contact_email', label: 'Primary Contact Email', type: 'email' },
      { id: 'contact_phone', label: 'Primary Contact Phone', type: 'tel' },
      { id: 'nzbn', label: 'NZBN', type: 'text' },
      { id: 'address_1', label: 'Street Address', type: 'text' },
      { id: 'address_city', label: 'City', type: 'text' },
      { id: 'address_postcode', label: 'Postcode', type: 'text' },
      {
        id: 'risk_classification',
        label: 'Risk Classification (Internal)',
        type: 'select',
        options: ['Critical', 'High', 'Medium', 'Low'],
        visibleWhen: (_formData, userRole) => userRole === 'admin',
      },
    ],
  },
  sections: [
    {
      id: 'products',
      title: '1. Products',
      type: 'repeatable-group',
      itemLabel: 'Product',
      addLabel: 'Add another product',
      fields: [
        { id: 'product_name', label: 'Product Name', type: 'text', required: true },
        {
          id: 'product_type',
          label: 'Product Type',
          type: 'checkbox-list',
          options: ['Admixture', 'Additive', 'SCM', 'Other'],
        },
        {
          id: 'safety_docs',
          label: 'Safety Documents',
          type: 'document-group',
          options: ['TDS', 'SDS'],
        },
        { id: 'test_each_batch', label: 'Do you test each batch?', type: 'yes_no' },
        { id: 'aligned_standards', label: 'Are test methods aligned to standards?', type: 'yes_no' },
        {
          id: 'standards_list',
          label: 'If yes, which standards?',
          type: 'text',
          visibleWhen: (productData) => productData.aligned_standards === 'yes',
        },
        {
          id: 'coa_provided',
          label: 'Certificate of Analysis (CoA)',
          type: 'document-evidence',
        },
        {
          id: 'evidence_of_use',
          label: 'Evidence of use',
          type: 'checkbox-list',
          options: ['Concrete', 'Aggregates'],
        },
        { id: 'affect_strength', label: 'Can the product affect strength?', type: 'yes_no' },
        { id: 'affect_set_time', label: 'Can the product affect set time?', type: 'yes_no' },
        { id: 'affect_durability', label: 'Can the product affect durability?', type: 'yes_no' },
        { id: 'affect_testing', label: 'Can the product affect testing results?', type: 'yes_no' },
        { id: 'dosage_variance', label: 'What happens if dosage varies?', type: 'text', multiline: true },
        { id: 'limitations_of_use', label: 'Limitations of use', type: 'text', multiline: true },
        {
          id: 'complies_nz_standards',
          label: 'Complies with NZ or equivalent standards?',
          type: 'yes_no',
        },
        {
          id: 'certifications',
          label: 'Product Certifications',
          type: 'certification-list',
        },
        {
          id: 'hazard_classification',
          label: 'Hazard classification (if applicable)',
          type: 'text',
        },
      ],
    },
    {
      id: 'traceability_supply_chain',
      title: '2. Traceability & Supply Chain',
      type: 'group',
      fields: [
        { id: 'batch_numbering', label: 'Batch numbering system in place?', type: 'yes_no' },
        { id: 'traceability_source', label: 'Traceability to source?', type: 'yes_no' },
        { id: 'recall_procedure', label: 'Recall procedure in place?', type: 'yes_no' },
      ],
    },
    {
      id: 'manufacturing_raw_materials',
      title: '3. Manufacturing & Raw Materials',
      type: 'group',
      fields: [
        { id: 'manufacturing_locations', label: 'Manufacturing location(s)', type: 'text' },
        { id: 'production_type', label: 'Production', type: 'select', options: ['In-house', 'Outsourced'] },
        {
          id: 'raw_material_checks',
          label: 'How are raw materials checked before use?',
          type: 'text',
          multiline: true,
        },
      ],
    },
    {
      id: 'technical_support',
      title: '4. Technical Support',
      type: 'group',
      fields: [
        {
          id: 'services_provided',
          label: 'Services provided',
          type: 'checkbox-list',
          options: ['Mix design', 'Trials', 'Troubleshooting'],
        },
      ],
    },
    {
      id: 'supply_delivery',
      title: '5. Supply & Delivery',
      type: 'group',
      fields: [
        { id: 'lead_time', label: 'Lead time', type: 'text' },
        { id: 'supply_capacity', label: 'Supply capacity', type: 'text' },
        { id: 'delivery_method', label: 'Delivery method', type: 'text' },
      ],
    },
    {
      id: 'change_management',
      title: '6. Change Management',
      type: 'group',
      fields: [
        {
          id: 'notify_changes_to',
          label: 'Will you notify changes to:',
          type: 'checkbox-list',
          options: ['Raw materials', 'Formulation', 'Manufacturing process'],
        },
        { id: 'notice_period', label: 'Notice period', type: 'text' },
      ],
    },
    {
      id: 'incidents_history',
      title: '7. Incidents & History',
      type: 'group',
      fields: [
        { id: 'product_complaints', label: 'Any product complaints/failures?', type: 'yes_no' },
        {
          id: 'complaints_summary',
          label: 'If yes, please provide a summary:',
          type: 'text',
          multiline: true,
          visibleWhen: (formData) => formData.product_complaints === 'yes',
        },
      ],
    },
    {
      id: 'internal_assessment',
      title: '8. Internal Assessment (For Internal Use Only)',
      type: 'group',
      visibleWhen: (_formData, userRole) => userRole === 'admin',
      fields: [
        { id: 'supplier_dependency', label: 'Supplier dependency', type: 'select', options: ['High', 'Medium', 'Low'] },
        {
          id: 'availability_alternatives',
          label: 'Availability of alternatives',
          type: 'select',
          options: ['High', 'Medium', 'Low'],
        },
        {
          id: 'final_decision',
          label: 'Final Decision',
          type: 'select',
          options: ['Approved', 'Trial Required', 'Not Approved'],
        },
        { id: 'assessment_comments', label: 'Comments', type: 'text', multiline: true },
        { id: 'assessor_signature', label: 'Assessor Signature', type: 'signature-pad' },
      ],
    },
  ],
};

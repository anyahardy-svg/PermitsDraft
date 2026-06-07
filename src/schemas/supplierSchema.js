export const supplierSchema = {
  sections: [
    {
      id: "supplier_information",
      title: "1. Supplier Information",
      type: "group",
      fields: [
        { id: "company_name", label: "Company Name", type: "text", required: true },
        { id: "tech_contact_name", label: "Technical Contact Name", type: "text" },
        { id: "risk_classification", label: "Risk Classification (Internal)", type: "select", options: ["Critical", "High", "Medium", "Low"] }
      ]
    },
    {
      id: "product_information",
      title: "2. Product Information",
      type: "repeatable-group",
      fields: [
        { id: "product_name", label: "Product Name", type: "text" },
        { id: "product_type", label: "Product Type", type: "checkbox-list", options: ["Admixture", "Additive", "SCM", "Other"] },
        { id: "safety_docs", label: "Provide", type: "document-group", options: ["TDS", "SDS"] }
      ]
    },
    {
      id: "qa_and_testing",
      title: "3. Quality Assurance & Testing",
      type: "group",
      fields: [
        { id: "test_each_batch", label: "Do you test each batch?", type: "yes_no" },
        { id: "aligned_standards", label: "Are test methods aligned to standards?", type: "yes_no" },
        { 
          id: "standards_list", 
          label: "If yes, which standards?", 
          type: "text", 
          visibleWhen: (formData) => formData.aligned_standards === 'yes' 
        },
        { id: "coa_provided", label: "Certificate of Analysis (CoA) provided?", type: "document-evidence" }
      ]
    },
    {
      id: "product_performance_risk",
      title: "4. Product Performance & Risk",
      type: "group",
      fields: [
        { id: "evidence_of_use", label: "Evidence of use", type: "checkbox-list", options: ["Concrete", "Aggregates"] },
        { id: "affect_strength", label: "Can the product affect strength?", type: "yes_no" },
        { id: "affect_set_time", label: "Can the product affect set time?", type: "yes_no" },
        { id: "affect_durability", label: "Can the product affect durability?", type: "yes_no" },
        { id: "affect_testing", label: "Can the product affect testing results?", type: "yes_no" },
        { id: "dosage_variance", label: "What happens if dosage varies?", type: "text", multiline: true },
        { id: "limitations_of_use", label: "Limitations of use", type: "text", multiline: true }
      ]
    },
    {
      id: "traceability_supply_chain",
      title: "5. Traceability & Supply Chain",
      type: "group",
      fields: [
        { id: "batch_numbering", label: "Batch numbering system in place?", type: "yes_no" },
        { id: "traceability_source", label: "Traceability to source?", type: "yes_no" },
        { id: "recall_procedure", label: "Recall procedure in place?", type: "yes_no" }
      ]
    },
    {
      id: "manufacturing_raw_materials",
      title: "6. Manufacturing & Raw Materials",
      type: "group",
      fields: [
        { id: "manufacturing_locations", label: "Manufacturing location(s)", type: "text" },
        { id: "production_type", label: "Production", type: "select", options: ["In-house", "Outsourced"] },
        { id: "raw_material_checks", label: "How are raw materials checked before use?", type: "text", multiline: true }
      ]
    },
    {
      id: "compliance_certification",
      title: "7. Compliance & Certification",
      type: "group",
      fields: [
        { id: "complies_nz_standards", label: "Complies with NZ or equivalent standards?", type: "yes_no" },
        { id: "third_party_certifications_details", label: "Third-party certifications (if any)", type: "text" },
        { 
          id: "third_party_certifications_upload", 
          label: "Upload Certificates", 
          type: "document-evidence",
          visibleWhen: (formData) => !!formData.third_party_certifications_details 
        },
        { id: "hazard_classification", label: "Hazard classification (if applicable)", type: "text" }
      ]
    },
    {
      id: "technical_support",
      title: "8. Technical Support",
      type: "group",
      fields: [
        { id: "services_provided", label: "Services provided", type: "checkbox-list", options: ["Mix design", "Trials", "Troubleshooting"] }
      ]
    },
    {
      id: "supply_delivery",
      title: "9. Supply & Delivery",
      type: "group",
      fields: [
        { id: "lead_time", label: "Lead time", type: "text" },
        { id: "supply_capacity", label: "Supply capacity", type: "text" },
        { id: "delivery_method", label: "Delivery method", type: "text" }
      ]
    },
    {
      id: "change_management",
      title: "10. Change Management",
      type: "group",
      fields: [
        { id: "notify_changes_to", label: "Will you notify changes to:", type: "checkbox-list", options: ["Raw materials", "Formulation", "Manufacturing process"] },
        { id: "notice_period", label: "Notice period", type: "text" }
      ]
    },
    {
      id: "incidents_history",
      title: "11. Incidents & History",
      type: "group",
      fields: [
        { id: "product_complaints", label: "Any product complaints/failures?", type: "yes_no" },
        { 
          id: "complaints_summary", 
          label: "If yes, please provide a summary:", 
          type: "text", 
          multiline: true,
          visibleWhen: (formData) => formData.product_complaints === 'yes'
        }
      ]
    },
    {
      id: "internal_assessment",
      title: "12. Internal Assessment (For Internal Use Only)",
      type: "group",
      visibleWhen: (formData, userRole) => userRole === 'admin', 
      fields: [
        { id: "supplier_dependency", label: "Supplier dependency", type: "select", options: ["High", "Medium", "Low"] },
        { id: "availability_alternatives", label: "Availability of alternatives", type: "select", options: ["High", "Medium", "Low"] },
        { id: "final_decision", label: "Final Decision", type: "select", options: ["Approved", "Trial Required", "Not Approved"] },
        { id: "assessment_comments", label: "Comments", type: "text", multiline: true },
        { id: "assessor_signature", label: "Assessor Signature", type: "signature-pad" }
      ]
    }
  ]
};

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  CheckBox,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { getCompanyAccreditation, updateCompanyAccreditation, getExpiryStatus, uploadAccreditationCertificate, deleteAccreditationCertificate } from '../api/accreditations';
import { listCompanies } from '../api/companies';
import { listAllServices } from '../api/services';
import { listBusinessUnits } from '../api/business_units';

/**
 * CompanyAccreditationScreen
 * Contractor accreditation form with auto-filtered company data
 * 
 * @param {UUID} companyId - Company ID to load (required when logged in)
 * @param {boolean} isAdmin - Whether user is admin (sees all companies) - not used when companyId provided
 * @param {Object} styles - App stylesheet
 * @param {function} onClose - Callback to close screen
 * @param {function} onNavigateToTrainingRecords - Callback to navigate to training records after accreditation
 */
export default function CompanyAccreditationScreen({ 
  companyId, 
  isAdmin = false, 
  styles,
  onClose,
  onNavigateToTrainingRecords
}) {
  const scrollViewRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // If companyId is provided (logged-in contractor), use it directly
  const [currentCompanyId, setCurrentCompanyId] = useState(companyId);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [accreditationStatus, setAccreditationStatus] = useState('in-progress'); // 'in-progress' or 'completed'
  const [expandedSections, setExpandedSections] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false, 14: false, 15: false, 16: false, 17: false, 18: false, 19: false, 20: false, 21: false, 22: false, 23: false, 24: false, 25: false }); // Track which sections are expanded
  const [expandedEvidenceUI, setExpandedEvidenceUI] = useState(null); // Track which evidence UI is expanded (format: 'section-itemkey')
  const [services, setServices] = useState([]); // Services from database
  const [businessUnits, setBusinessUnits] = useState([]); // Business units from database

  // Section 1 state (Services)
  const [approvedServices, setApprovedServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState({});
  
  // Section 2 state (Business Units & Accreditations)
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState({});

  // Section 3 state
  const [accreditedSystems, setAccreditedSystems] = useState({});
  const [certificateFiles, setCertificateFiles] = useState({});

  // Section 3 state (Policies)
  const [policies, setPolicies] = useState({
    health_safety: { exists: false, url: null },
    environmental: { exists: false, url: null },
    drug_alcohol: { exists: false, url: null },
    quality: { exists: false, url: null }
  });

  // Section 1 state (Services) - No state needed, handled separately
  // Section 2 state (Business Units) - No state needed, handled separately  
  // Section 3 state (Policies) - Using policies state above

  // Section 4 state (Accident, Incident & Investigation)
  const [section4, setSection4] = useState({
    accident_reporting: { exists: false, score: 0, evidence: null },
    accident_investigation: { exists: false, score: 0, evidence: null }
  });

  // Section 5 state (Health Hazard Management)
  const [section5, setSection5] = useState({
    health_hazard_plan: { exists: false, score: 0, evidence: null },
    exposure_monitoring: { exists: false, frequency: 1, score: 0, evidence: null },
    respiratory_training: { exists: false, score: 0, evidence: null },
    exhaust_ventilation: { exists: false, score: 0, evidence: null },
    health_monitoring: { exists: false, frequency: 1, score: 0, evidence: null }
  });

  // Section 6 state (Induction & Training)
  const [section6, setSection6] = useState({
    induction_programme: { exists: false, score: 0, evidence: null },
    induction_records_process: { exists: false, score: 0, evidence: null },
    skills_training_list: { exists: false, score: 0, evidence: null },
    competency_testing_system: { exists: false, score: 0, evidence: null }
  });

  // Section 7 state (Hazard Identification & Management)
  const [section7, setSection7] = useState({
    hazard_identification_process: { exists: false, score: 0, evidence: null },
    jha_jsea_system: { exists: false, score: 0, evidence: null },
    risk_registers: { exists: false, score: 0, evidence: null }
  });

  // Section 8 state (PPE)
  const [section8, setSection8] = useState({
    ppe_compliance_yesno: 'no',
    ppe_training_maintenance: { exists: false, score: 0, evidence: null },
    ppe_job_assessment: { exists: false, score: 0, evidence: null },
    ppe_maintenance_schedule: { exists: false, score: 0, evidence: null }
  });

  // Section 9 state (Plant & Equipment)
  const [section9, setSection9] = useState({
    plant_equipment_onsite_yesno: 'no',
    plant_equipment_licenses: { exists: false, score: 0, evidence: null },
    plant_equipment_safety_provisions: { exists: false, score: 0, evidence: null },
    plant_equipment_maintenance: { exists: false, score: 0, evidence: null }
  });

  // Section 10 state (Electrical Equipment)
  const [section10, setSection10] = useState({
    electrical_equipment_onsite_yesno: 'no',
    electrical_equipment_testing: { exists: false, score: 0, evidence: null },
    electrical_equipment_licenses: { exists: false, score: 0, evidence: null },
    electrical_equipment_safety_provisions: { exists: false, score: 0, evidence: null },
    electrical_equipment_maintenance: { exists: false, score: 0, evidence: null }
  });

  // Section 11 state (Emergency Preparedness & Response)
  const [section11, setSection11] = useState({
    emergency_procedures: { exists: false, score: 0, evidence: null },
    emergency_first_aid_yesno: 'no',
    emergency_first_aid_equipment: ''
  });

  // Section 12 state (Site Specific Safety Plans)
  const [section12, setSection12] = useState({
    site_safety_plans: { exists: false, score: 0, evidence: null },
    site_induction_process: { exists: false, score: 0, evidence: null }
  });

  // Section 13 state (Contractor Management)
  const [section13, setSection13] = useState({
    contractor_induction: { exists: false, score: 0, evidence: null },
    contractor_compliance: { exists: false, score: 0, evidence: null }
  });

  // Section 14 state (Health & Wellbeing)
  const [section14, setSection14] = useState({
    health_wellbeing_program: { exists: false, score: 0, evidence: null },
    fatigue_management: { exists: false, score: 0, evidence: null }
  });

 

  // Section 15 state (Competency & Qualifications)
  const [section15, setSection15] = useState({
    competency_framework: { exists: false, score: 0, evidence: null },
    training_records: { exists: false, score: 0, evidence: null }
  });

  // Section 16 state (Communication & Reporting)
  const [section16, setSection16] = useState({
    safety_communication: { exists: false, score: 0, evidence: null },
    near_miss_reporting: { exists: false, score: 0, evidence: null }
  });

  // Section 17 state (Performance & Review)
  const [section17, setSection17] = useState({
    performance_monitoring: { exists: false, score: 0, evidence: null },
    regular_audits: { exists: false, score: 0, evidence: null }
  });

  // Section 18 state (Injury Management)
  const [section18, setSection18] = useState({
    injury_management: { exists: false, score: 0, evidence: null },
    early_intervention: { exists: false, score: 0, evidence: null }
  });

  // Section 19 state (Continuous Improvement)
  const [section19, setSection19] = useState({
    safety_objectives: { exists: false, score: 0, evidence: null },
    management_review: { exists: false, score: 0, evidence: null }
  });

  // Section 20 state (Incidents & Breaches)
  const [section20, setSection20] = useState({
    incidents_breaches: { 
      fatalities: '', 
      serious_harm: '', 
      lost_time: '', 
      property_damage: '', 
      pending_prosecutions: 'no',
      prosecutions_5_years: '',
      environmental_notices: 'no',
      exists: false, 
      score: 0, 
      evidence: null 
    }
  });

   // Section 21 state (Quality Management - shown when ISO 9001 is NOT certified)
  const [section21, setSection21] = useState({
    quality_manager_and_plan: { exists: false, score: 0, evidence: null },
    roles_and_responsibilities: { exists: false, score: 0, evidence: null },
    purchasing_procedures: { exists: false, score: 0, evidence: null },
    subcontractor_evaluation: { exists: false, score: 0, evidence: null },
    process_control_plan: { exists: false, score: 0, evidence: null },
    nonconformance_procedure: { exists: false, score: 0, evidence: null },
    product_rejection: { exists: false, score: 0, evidence: null },
    personnel_induction: { exists: false, score: 0, evidence: null },
    internal_audits: { exists: false, score: 0, evidence: null },
    continuous_improvement: { exists: false, score: 0, evidence: null }
  });

  // Section 22 state (Environmental Management - shown when ISO 14001 is NOT certified)
  const [section22, setSection22] = useState({
    environmental_aspects_assessment: { exists: false, score: 0, evidence: null },
    environmental_system_and_plans: { exists: false, score: 0, evidence: null },
    waste_management_policy: { exists: false, score: 0, evidence: null },
    environmental_improvement_targets: { exists: false, score: 0, evidence: null },
    environmental_training_programme: { exists: false, score: 0, evidence: null }
  });

  // Section 24 state (Insurance Documents)
  const [section24, setSection24] = useState({
    public_liability_insurance: {
      expiry_date: '',
      url: null,
      uploaded_at: null,
      has_document: false
    },
    motor_vehicle_insurance: {
      expiry_date: '',
      url: null,
      uploaded_at: null,
      has_document: false
    }
  });

  // Section 25 state (Contact Information)
  const [section25, setSection25] = useState({
    health_safety_manager: {
      name: '',
      email: '',
      phone: ''
    },
    environmental_manager: {
      name: '',
      email: '',
      phone: ''
    },
    quality_manager: {
      name: '',
      email: '',
      phone: ''
    },
    occupational_hygienist: {
      name: '',
      email: '',
      phone: ''
    }
  });

  // Company information state (for verification/updates)
  const [companyDetails, setCompanyDetails] = useState({
    companyName: '',
    companyEmail: '',
    contactName: '',
    contactSurname: '',
    contactEmail: '',
    contactPhone: '',
    contractorName: '',
    contractorEmail: ''
  });



  const ACCREDITED_SYSTEMS = [
    { key: 'aep_accredited', label: 'ACC Accredited Employer Programme (AEP)' },
    { key: 'iso_45001_certified', label: 'ISO 45001 (Occupational Health and Safety)' },
    { key: 'totika_prequalified', label: 'Totika Prequalification' },
    { key: 'she_prequal_qualified', label: 'SHE Prequal Prequalification' },
    { key: 'impac_prequalified', label: 'IMPAC Prequal Prequalification' },
    { key: 'sitewise_prequalified', label: 'SiteWise (Site Safe) Prequalification' },
    { key: 'rapid_prequalified', label: 'RAPID Prequalification (Australia only)' },
    { key: 'iso_9001_certified', label: 'ISO 9001 (Quality)' },
    { key: 'iso_14001_certified', label: 'ISO 14001 (Environmental)' }
  ];

  const SCORING_CRITERIA = {
    1: 'Minimal/informal processes; no written procedures',
    2: 'Basic systems exist; assigned responsibilities',
    3: 'Formal systems in place; consistent application; structured communication',
    4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
  };

  // Load company data
  useEffect(() => {
    loadCompanyData();
    if (isAdmin) loadAllCompanies();
  }, [currentCompanyId]);

  // Load services and business units on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, businessUnitsData] = await Promise.all([
          listAllServices(),
          listBusinessUnits()
        ]);
        setServices(servicesData || []);
        setBusinessUnits(businessUnitsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Format date to NZ format (dd/mm/yyyy)
  const formatDateNZ = (date) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return date;
    }
  };

  // Parse NZ date format (dd/mm/yyyy) to ISO string
  const parseNZDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/');
    if (!day || !month || !year) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const loadCompanyData = async () => {
    // Don't load if no company ID is set
    if (!currentCompanyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getCompanyAccreditation(currentCompanyId);
      setCompany(data);
      
      // Populate company details from the fetched company data
      setCompanyDetails(prev => ({
        ...prev,
        companyName: data.name || '',
        companyEmail: data.email || '',
        contactName: data.contact_name || '',
        contactSurname: data.contact_surname || '',
        contactEmail: data.contact_email || '',
        contactPhone: data.contact_phone || ''
      }));
      
      // Populate approved services (now using service IDs from database)
      setApprovedServices(data.approved_services || []);
      const serviceMap = {};
      (data.approved_services || []).forEach(serviceId => {
        serviceMap[serviceId] = true;
      });
      setSelectedServices(serviceMap);

      const buMap = {};
      (data.fletcher_business_units || []).forEach(unitId => {
        buMap[unitId] = true;
      });
      setSelectedBusinessUnits(buMap);

      // Populate accredited systems
      const systems = {};
      ACCREDITED_SYSTEMS.forEach(sys => {
        // Get base name by removing status suffixes
        const baseName = sys.key
          .replace('_accredited', '')
          .replace('_certified', '')
          .replace('_qualified', '')
          .replace('_prequalified', '');

        const expiryKeyName = `${baseName}_certificate_expiry`;
        const isoDate = data[expiryKeyName] || null;
        // Convert ISO date (yyyy-mm-dd) to NZ format (dd/mm/yyyy)
        let nzDate = null;
        if (isoDate) {
          try {
            // Parse ISO date string directly to avoid timezone issues
            const [year, month, day] = isoDate.split('-');
            if (year && month && day) {
              nzDate = `${day}/${month}/${year}`;
            } else {
              nzDate = isoDate;
            }
          } catch (e) {
            nzDate = isoDate;
          }
        }
        systems[sys.key] = {
          checked: data[sys.key] || false,
          expiryDate: nzDate,
          certificateUrl: data[`${baseName}_certificate_url`] || null
        };
      });
      setAccreditedSystems(systems);
      
      // Set accreditation status
      setAccreditationStatus(data.accreditation_status || 'in-progress');

      // Load policies (Section 3)
      setPolicies({
        health_safety: {
          exists: data.health_safety_policy_exists || false,
          url: data.health_safety_policy_url || null
        },
        environmental: {
          exists: data.environmental_policy_exists || false,
          url: data.environmental_policy_url || null
        },
        drug_alcohol: {
          exists: data.drug_alcohol_policy_exists || false,
          url: data.drug_alcohol_policy_url || null
        },
        quality: {
          exists: data.quality_policy_exists || false,
          url: data.quality_policy_url || null
        }
      });

      // Load section 4 (Accident & Incident Management)
      setSection4({
        accident_reporting: {
          exists: data.accident_reporting_exists || false,
          score: data.accident_reporting_score || 0,
          evidence: data.accident_reporting_evidence_url || null
        },
        accident_investigation: {
          exists: data.accident_investigation_exists || false,
          score: data.accident_investigation_score || 0,
          evidence: data.accident_investigation_evidence_url || null
        }
      });

      // Load section 5 (Health Hazard Management)
      setSection5({
        health_hazard_plan: {
          exists: data.health_hazard_plan_exists || false,
          score: data.health_hazard_plan_score || 0,
          evidence: data.health_hazard_plan_evidence_url || null
        },
        exposure_monitoring: {
          exists: data.exposure_monitoring_exists || false,
          frequency: data.exposure_monitoring_frequency || 1,
          score: data.exposure_monitoring_score || 0,
          evidence: data.exposure_monitoring_evidence_url || null
        },
        respiratory_training: {
          exists: data.respiratory_training_exists || false,
          score: data.respiratory_training_score || 0,
          evidence: data.respiratory_training_evidence_url || null
        },
        exhaust_ventilation: {
          exists: data.exhaust_ventilation_exists || false,
          score: data.exhaust_ventilation_score || 0,
          evidence: data.exhaust_ventilation_evidence_url || null
        },
        health_monitoring: {
          exists: data.health_monitoring_exists || false,
          frequency: data.health_monitoring_frequency || 1,
          score: data.health_monitoring_score || 0,
          evidence: data.health_monitoring_evidence_url || null
        }
      });

      // Load section 6 (Induction & Training)
      setSection6({
        induction_programme: {
          exists: data.induction_programme_exists || false,
          score: data.induction_programme_score || 0,
          evidence: data.induction_programme_evidence_url || null
        },
        induction_records_process: {
          exists: data.induction_records_process_exists || false,
          score: data.induction_records_process_score || 0,
          evidence: data.induction_records_process_evidence_url || null
        },
        skills_training_list: {
          exists: data.skills_training_list_exists || false,
          score: data.skills_training_list_score || 0,
          evidence: data.skills_training_list_evidence_url || null
        },
        competency_testing_system: {
          exists: data.competency_testing_system_exists || false,
          score: data.competency_testing_system_score || 0,
          evidence: data.competency_testing_system_evidence_url || null
        }
      });

      // Load section 7 (Hazard Identification & Management)
      setSection7({
        hazard_identification_process: {
          exists: data.hazard_identification_process_exists || false,
          score: data.hazard_identification_process_score || 0,
          evidence: data.hazard_identification_process_evidence_url || null
        },
        jha_jsea_system: {
          exists: data.jha_jsea_system_exists || false,
          score: data.jha_jsea_system_score || 0,
          evidence: data.jha_jsea_system_evidence_url || null
        },
        risk_registers: {
          exists: data.risk_registers_exists || false,
          score: data.risk_registers_score || 0,
          evidence: data.risk_registers_evidence_url || null
        }
      });

      // Load section 8 (PPE)
      setSection8({
        ppe_compliance_yesno: data.ppe_compliance_yesno || 'no',
        ppe_training_maintenance: {
          exists: data.ppe_training_maintenance_exists || false,
          score: data.ppe_training_maintenance_score || 0,
          evidence: data.ppe_training_maintenance_evidence_url || null
        },
        ppe_job_assessment: {
          exists: data.ppe_job_assessment_exists || false,
          score: data.ppe_job_assessment_score || 0,
          evidence: data.ppe_job_assessment_evidence_url || null
        },
        ppe_maintenance_schedule: {
          exists: data.ppe_maintenance_schedule_exists || false,
          score: data.ppe_maintenance_schedule_score || 0,
          evidence: data.ppe_maintenance_schedule_evidence_url || null
        }
      });

      // Load section 9 (Plant & Equipment)
      setSection9({
        plant_equipment_onsite_yesno: data.plant_equipment_onsite_yesno || 'no',
        plant_equipment_licenses: {
          exists: data.plant_equipment_licenses_exists || false,
          score: data.plant_equipment_licenses_score || 0,
          evidence: data.plant_equipment_licenses_evidence_url || null
        },
        plant_equipment_safety_provisions: {
          exists: data.plant_equipment_safety_provisions_exists || false,
          score: data.plant_equipment_safety_provisions_score || 0,
          evidence: data.plant_equipment_safety_provisions_evidence_url || null
        },
        plant_equipment_maintenance: {
          exists: data.plant_equipment_maintenance_exists || false,
          score: data.plant_equipment_maintenance_score || 0,
          evidence: data.plant_equipment_maintenance_evidence_url || null
        }
      });

      // Load section 10 (Electrical Equipment)
      setSection10({
        electrical_equipment_onsite_yesno: data.electrical_equipment_onsite_yesno || 'no',
        electrical_equipment_testing: {
          exists: data.electrical_equipment_testing_exists || false,
          score: data.electrical_equipment_testing_score || 0,
          evidence: data.electrical_equipment_testing_evidence_url || null
        },
        electrical_equipment_licenses: {
          exists: data.electrical_equipment_licenses_exists || false,
          score: data.electrical_equipment_licenses_score || 0,
          evidence: data.electrical_equipment_licenses_evidence_url || null
        },
        electrical_equipment_safety_provisions: {
          exists: data.electrical_equipment_safety_provisions_exists || false,
          score: data.electrical_equipment_safety_provisions_score || 0,
          evidence: data.electrical_equipment_safety_provisions_evidence_url || null
        },
        electrical_equipment_maintenance: {
          exists: data.electrical_equipment_maintenance_exists || false,
          score: data.electrical_equipment_maintenance_score || 0,
          evidence: data.electrical_equipment_maintenance_evidence_url || null
        }
      });

      // Load section 11 (Emergency Preparedness & Response)
      setSection11({
        emergency_procedures: {
          exists: data.emergency_procedures_exists || false,
          score: data.emergency_procedures_score || 0,
          evidence: data.emergency_procedures_evidence_url || null
        },
        emergency_first_aid_yesno: data.emergency_first_aid_yesno || 'no',
        emergency_first_aid_equipment: data.emergency_first_aid_equipment || ''
      });

      // Load section 12 (Site Specific Safety Plans)
      setSection12({
        site_safety_plans: {
          exists: data.site_safety_plans_exists || false,
          score: data.site_safety_plans_score || 0,
          evidence: data.site_safety_plans_evidence_url || null
        },
        site_induction_process: {
          exists: data.site_induction_process_exists || false,
          score: data.site_induction_process_score || 0,
          evidence: data.site_induction_process_evidence_url || null
        }
      });

      // Load section 13 (Contractor Management)
      setSection13({
        contractor_induction: {
          exists: data.contractor_induction_exists || false,
          score: data.contractor_induction_score || 0,
          evidence: data.contractor_induction_evidence_url || null
        },
        contractor_compliance: {
          exists: data.contractor_compliance_exists || false,
          score: data.contractor_compliance_score || 0,
          evidence: data.contractor_compliance_evidence_url || null
        }
      });

      // Load section 14 (Health & Wellbeing)
      setSection14({
        health_wellbeing_program: {
          exists: data.health_wellbeing_program_exists || false,
          score: data.health_wellbeing_program_score || 0,
          evidence: data.health_wellbeing_program_evidence_url || null
        },
        fatigue_management: {
          exists: data.fatigue_management_exists || false,
          score: data.fatigue_management_score || 0,
          evidence: data.fatigue_management_evidence_url || null
        }
      });

      // Load section 21 (Quality Management)
      setSection21({
        quality_manager_and_plan: {
          exists: data.quality_manager_and_plan_exists || false,
          score: data.quality_manager_and_plan_score || 0,
          evidence: data.quality_manager_and_plan_evidence_url || null
        },
        roles_and_responsibilities: {
          exists: data.roles_and_responsibilities_exists || false,
          score: data.roles_and_responsibilities_score || 0,
          evidence: data.roles_and_responsibilities_evidence_url || null
        },
        purchasing_procedures: {
          exists: data.purchasing_procedures_exists || false,
          score: data.purchasing_procedures_score || 0,
          evidence: data.purchasing_procedures_evidence_url || null
        },
        subcontractor_evaluation: {
          exists: data.subcontractor_evaluation_exists || false,
          score: data.subcontractor_evaluation_score || 0,
          evidence: data.subcontractor_evaluation_evidence_url || null
        },
        process_control_plan: {
          exists: data.process_control_plan_exists || false,
          score: data.process_control_plan_score || 0,
          evidence: data.process_control_plan_evidence_url || null
        },
        nonconformance_procedure: {
          exists: data.nonconformance_procedure_exists || false,
          score: data.nonconformance_procedure_score || 0,
          evidence: data.nonconformance_procedure_evidence_url || null
        },
        product_rejection: {
          exists: data.product_rejection_exists || false,
          score: data.product_rejection_score || 0,
          evidence: data.product_rejection_evidence_url || null
        },
        personnel_induction: {
          exists: data.personnel_induction_exists || false,
          score: data.personnel_induction_score || 0,
          evidence: data.personnel_induction_evidence_url || null
        },
        internal_audits: {
          exists: data.internal_audits_exists || false,
          score: data.internal_audits_score || 0,
          evidence: data.internal_audits_evidence_url || null
        },
        continuous_improvement: {
          exists: data.continuous_improvement_exists || false,
          score: data.continuous_improvement_score || 0,
          evidence: data.continuous_improvement_evidence_url || null
        }
      });

      // Load section 22 (Environmental Management)
      setSection22({
        environmental_aspects_assessment: {
          exists: data.environmental_aspects_assessment_exists || false,
          score: data.environmental_aspects_assessment_score || 0,
          evidence: data.environmental_aspects_assessment_evidence_url || null
        },
        environmental_system_and_plans: {
          exists: data.environmental_system_and_plans_exists || false,
          score: data.environmental_system_and_plans_score || 0,
          evidence: data.environmental_system_and_plans_evidence_url || null
        },
        waste_management_policy: {
          exists: data.waste_management_policy_exists || false,
          score: data.waste_management_policy_score || 0,
          evidence: data.waste_management_policy_evidence_url || null
        },
        environmental_improvement_targets: {
          exists: data.environmental_improvement_targets_exists || false,
          score: data.environmental_improvement_targets_score || 0,
          evidence: data.environmental_improvement_targets_evidence_url || null
        },
        environmental_training_programme: {
          exists: data.environmental_training_programme_exists || false,
          score: data.environmental_training_programme_score || 0,
          evidence: data.environmental_training_programme_evidence_url || null
        }
      });

      // Load section 24 (Insurance Documents)
      setSection24({
        public_liability_insurance: {
          expiry_date: data.public_liability_insurance_expiry || '',
          url: data.public_liability_insurance_url || null,
          uploaded_at: data.public_liability_insurance_uploaded_at || null,
          has_document: !!data.public_liability_insurance_url
        },
        motor_vehicle_insurance: {
          expiry_date: data.motor_vehicle_insurance_expiry || '',
          url: data.motor_vehicle_insurance_url || null,
          uploaded_at: data.motor_vehicle_insurance_uploaded_at || null,
          has_document: !!data.motor_vehicle_insurance_url
        }
      });

      // Load section 25 (Contact Information)
      setSection25({
        health_safety_manager: {
          name: data.health_safety_manager_name || '',
          email: data.health_safety_manager_email || '',
          phone: data.health_safety_manager_phone || ''
        },
        environmental_manager: {
          name: data.environmental_manager_name || '',
          email: data.environmental_manager_email || '',
          phone: data.environmental_manager_phone || ''
        },
        quality_manager: {
          name: data.quality_manager_name || '',
          email: data.quality_manager_email || '',
          phone: data.quality_manager_phone || ''
        },
        occupational_hygienist: {
          name: data.occupational_hygienist_name || '',
          email: data.occupational_hygienist_email || '',
          phone: data.occupational_hygienist_phone || ''
        }
      });

      // Load section 15 (Competency & Qualifications)
      setSection15({
        competency_framework: {
          exists: data.competency_framework_exists || false,
          score: data.competency_framework_score || 0,
          evidence: data.competency_framework_evidence_url || null
        },
        training_records: {
          exists: data.training_records_exists || false,
          score: data.training_records_score || 0,
          evidence: data.training_records_evidence_url || null
        }
      });

      // Load section 16 (Communication & Reporting)
      setSection16({
        safety_communication: {
          exists: data.safety_communication_exists || false,
          score: data.safety_communication_score || 0,
          evidence: data.safety_communication_evidence_url || null
        },
        near_miss_reporting: {
          exists: data.near_miss_reporting_exists || false,
          score: data.near_miss_reporting_score || 0,
          evidence: data.near_miss_reporting_evidence_url || null
        }
      });

      // Load section 17 (Performance & Review)
      setSection17({
        performance_monitoring: {
          exists: data.performance_monitoring_exists || false,
          score: data.performance_monitoring_score || 0,
          evidence: data.performance_monitoring_evidence_url || null
        },
        regular_audits: {
          exists: data.regular_audits_exists || false,
          score: data.regular_audits_score || 0,
          evidence: data.regular_audits_evidence_url || null
        }
      });

      // Load section 18 (Injury Management)
      setSection18({
        injury_management: {
          exists: data.injury_management_exists || false,
          score: data.injury_management_score || 0,
          evidence: data.injury_management_evidence_url || null
        },
        early_intervention: {
          exists: data.early_intervention_exists || false,
          score: data.early_intervention_score || 0,
          evidence: data.early_intervention_evidence_url || null
        }
      });

      // Load section 19 (Continuous Improvement)
      setSection19({
        safety_objectives: {
          exists: data.safety_objectives_exists || false,
          score: data.safety_objectives_score || 0,
          evidence: data.safety_objectives_evidence_url || null
        },
        management_review: {
          exists: data.management_review_exists || false,
          score: data.management_review_score || 0,
          evidence: data.management_review_evidence_url || null
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load accreditation data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCompanies = async () => {
    try {
      const data = await listCompanies();
      setCompanies(data || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const handleServiceToggle = (service) => {
    setSelectedServices(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  const handleBusinessUnitToggle = (unitId) => {
    setSelectedBusinessUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const handleAccreditationToggle = (key) => {
    setAccreditedSystems(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        checked: !(prev[key]?.checked || false)
      }
    }));
  };

  // Handle expiry date input - accepts dd/mm/yyyy and converts to ISO for storage
  const handleExpiryDateInput = (systemKey, rawInput) => {
    // Store the raw input as-is (user is typing)
    setAccreditedSystems(prev => ({
      ...prev,
      [systemKey]: {
        ...(prev[systemKey] || {}),
        expiryDate: rawInput,
        displayValue: rawInput // Track what the user is typing
      }
    }));
  };

  const toggleSection = (sectionNum) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionNum]: !prev[sectionNum]
    }));
  };

  const handleUploadCertificate = async (systemKey, systemLabel) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      // Convert the file URI to a blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });

      // Upload to Supabase Storage
      setLoading(true);
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        systemKey,
        fileObject
      );

      if (uploadResult.success) {
        // Update state with the new URL
        setAccreditedSystems(prev => ({
          ...prev,
          [systemKey]: {
            ...prev[systemKey],
            certificateUrl: uploadResult.url
          }
        }));
        // Restore scroll position after state update
        setTimeout(() => {
          if (scrollOffset > 0) {
            scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
          }
        }, 100);
        Alert.alert('Success', `${systemLabel} certificate uploaded successfully`);
      } else {
        Alert.alert('Error', 'Failed to upload certificate: ' + (uploadResult.error || 'Unknown error'));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete accreditation certificate
  const handleDeleteCertificate = async (systemKey, systemLabel) => {
    Alert.alert(
      'Delete Certificate',
      `Are you sure you want to delete the ${systemLabel} certificate? You can upload a new one afterwards.`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              const certificateUrl = accreditedSystems[systemKey]?.certificateUrl;
              
              if (!certificateUrl) {
                Alert.alert('Error', 'No certificate URL found');
                return;
              }

              const result = await deleteAccreditationCertificate(certificateUrl);

              if (result.success) {
                // Clear from state
                setAccreditedSystems(prev => ({
                  ...prev,
                  [systemKey]: {
                    ...prev[systemKey],
                    certificateUrl: null
                  }
                }));
                Alert.alert('Success', `${systemLabel} certificate deleted`);
              } else {
                Alert.alert('Error', 'Failed to delete certificate: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle uploading policy document
  const handleUploadPolicy = async (policyKey, policyLabel) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      // Convert the file URI to a blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });

      // Upload to Supabase Storage
      setLoading(true);
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        `policy_${policyKey}`,
        fileObject
      );

      if (uploadResult.success) {
        // Update state with the new URL
        setPolicies(prev => ({
          ...prev,
          [policyKey]: {
            ...prev[policyKey],
            url: uploadResult.url
          }
        }));
        // Restore scroll position after state update
        setTimeout(() => {
          if (scrollOffset > 0) {
            scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
          }
        }, 100);
        Alert.alert('Success', `${policyLabel} document uploaded successfully`);
      } else {
        Alert.alert('Error', 'Failed to upload: ' + (uploadResult.error || 'Unknown error'));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete policy document
  const handleDeletePolicy = async (policyKey, policyLabel) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete the ${policyLabel} document?`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              const policyUrl = policies[policyKey]?.url;
              
              if (!policyUrl) {
                Alert.alert('Error', 'No document URL found');
                return;
              }

              const result = await deleteAccreditationCertificate(policyUrl);

              if (result.success) {
                // Clear from state
                setPolicies(prev => ({
                  ...prev,
                  [policyKey]: {
                    ...prev[policyKey],
                    url: null
                  }
                }));
                Alert.alert('Success', `${policyLabel} document deleted`);
              } else {
                Alert.alert('Error', 'Failed to delete: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUploadInsuranceDocument = async (insuranceType, insuranceLabel) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      // Convert the file URI to a blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });

      // Upload to Supabase Storage (accreditations bucket, same as other docs)
      setLoading(true);
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        `insurance_${insuranceType}`,
        fileObject
      );

      if (uploadResult.success) {
        // Update state with the new URL and timestamp
        const insuranceKey = insuranceType === 'pli' ? 'public_liability_insurance' : 'motor_vehicle_insurance';
        setSection24(prev => ({
          ...prev,
          [insuranceKey]: {
            ...prev[insuranceKey],
            url: uploadResult.url,
            uploaded_at: new Date().toISOString(),
            has_document: true
          }
        }));
        // Restore scroll position after state update
        setTimeout(() => {
          if (scrollOffset > 0) {
            scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
          }
        }, 100);
        Alert.alert('Success', `${insuranceLabel} certificate uploaded successfully`);
      } else {
        Alert.alert('Error', 'Failed to upload: ' + (uploadResult.error || 'Unknown error'));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInsuranceDocument = async (insuranceType, insuranceLabel) => {
    const insuranceKey = insuranceType === 'pli' ? 'public_liability_insurance' : 'motor_vehicle_insurance';
    
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete the ${insuranceLabel} certificate?`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              const documentUrl = section24[insuranceKey]?.url;
              
              if (!documentUrl) {
                Alert.alert('Error', 'No document URL found');
                return;
              }

              const result = await deleteAccreditationCertificate(documentUrl);

              if (result.success) {
                // Clear from state
                setSection24(prev => ({
                  ...prev,
                  [insuranceKey]: {
                    ...prev[insuranceKey],
                    url: null,
                    has_document: false
                  }
                }));
                Alert.alert('Success', `${insuranceLabel} certificate deleted`);
              } else {
                Alert.alert('Error', 'Failed to delete: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle evidence upload for sections 4 & 5
  const handleUploadEvidence = async (section, itemKey, itemLabel) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      // Convert the file URI to a blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });

      // Upload to Supabase Storage
      setLoading(true);
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        `${section}_${itemKey}_evidence`,
        fileObject
      );

      if (uploadResult.success) {
        // Update state with the new URL
        if (section === 'section4') {
          setSection4(prev => ({
            ...prev,
            [itemKey]: {
              ...prev[itemKey],
              evidence: uploadResult.url
            }
          }));
        } else if (section === 'section5') {
          setSection5(prev => ({
            ...prev,
            [itemKey]: {
              ...prev[itemKey],
              evidence: uploadResult.url
            }
          }));
        }
        Alert.alert('Success', `${itemLabel} evidence uploaded successfully`);
      } else {
        Alert.alert('Error', 'Failed to upload: ' + (uploadResult.error || 'Unknown error'));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Unified helper function to render document toggle button and UI
  const renderDocumentToggle = (documentKey, itemData, itemLabel, handleUploadFn, handleDeleteFn = null, documentType = 'Evidence', showOnlyIcon = false) => {
    const isDocUIExpanded = expandedEvidenceUI === documentKey;
    const hasDocument = itemData?.url || itemData?.evidence || itemData?.certificateUrl;
    const needsDocument = itemData?.score > 1 && !hasDocument;

    // If showOnlyIcon is true, only render the paperclip button (for inline use in the row)
    if (showOnlyIcon) {
      return (
        <TouchableOpacity
          onPress={() => setExpandedEvidenceUI(isDocUIExpanded ? null : documentKey)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 5,
            backgroundColor: hasDocument ? '#D1FAE5' : needsDocument ? '#FEE2E2' : '#F3F4F6',
            borderWidth: 1,
            borderColor: hasDocument ? '#10B981' : needsDocument ? '#FCA5A5' : '#D1D5DB',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 4
          }}
        >
          <Text style={{ fontSize: 14 }}>📎</Text>
        </TouchableOpacity>
      );
    }

    // Otherwise render the full expanded UI
    return (
      <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', width: '100%' }}>
        {hasDocument ? (
          <>
            <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600', marginBottom: 8 }}>✓ {documentType} Uploaded</Text>
              <TouchableOpacity onPress={() => Linking.openURL(itemData?.url || itemData?.evidence || itemData?.certificateUrl)}>
                <Text style={{ fontSize: 11, color: '#3B82F6', textDecorationLine: 'underline' }}>📄 View / Download</Text>
              </TouchableOpacity>
            </View>
            {handleDeleteFn && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: '#EF4444', marginBottom: 8 }]}
                onPress={() => handleDeleteFn()}
              >
                <Text style={{ color: 'white', flexWrap: 'wrap', textAlign: 'center' }}>🗑 Delete {documentType}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleUploadFn()}
            >
              <Text style={{ color: 'white', flexWrap: 'wrap', textAlign: 'center' }}>📄 Replace {documentType}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {needsDocument && (
              <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>⚠️ {documentType} Required for Score {itemData?.score}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleUploadFn()}
            >
              <Text style={{ color: 'white', flexWrap: 'wrap', textAlign: 'center' }}>📄 Upload {documentType}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  // Helper function to render evidence toggle button and UI (for backward compatibility)
  const renderEvidenceToggle = (sectionNum, itemKey, itemData, itemLabel) => {
    const evidenceUIKey = `section${sectionNum}-${itemKey}`;
    return renderDocumentToggle(
      evidenceUIKey,
      itemData,
      itemLabel,
      () => handleUploadEvidence(`section${sectionNum}`, itemKey, itemLabel),
      null,
      'Evidence',
      true // showOnlyIcon = true to only show paperclip in the row
    );
  };

  // Build update data object
  const buildUpdateData = (status = accreditationStatus) => {
    const selectedBusinessUnitIds = Object.keys(selectedBusinessUnits).filter(u => selectedBusinessUnits[u]);
    
    const updateData = {
      name: companyDetails.companyName,
      email: companyDetails.companyEmail,
      contact_name: companyDetails.contactName,
      contact_surname: companyDetails.contactSurname,
      contact_email: companyDetails.contactEmail,
      contact_phone: companyDetails.contactPhone,
      approved_services: Object.keys(selectedServices).filter(s => selectedServices[s]),
      fletcher_business_units: selectedBusinessUnitIds,
      business_unit_ids: selectedBusinessUnitIds,
      accreditation_status: status
    };

    // Add accredited systems
    ACCREDITED_SYSTEMS.forEach(sys => {
      updateData[sys.key] = accreditedSystems[sys.key]?.checked || false;
      
      // Get base name by removing status suffixes
      const baseName = sys.key
        .replace('_accredited', '')
        .replace('_certified', '')
        .replace('_qualified', '')
        .replace('_prequalified', '');
      
      // Save certificate URL with correct column name pattern
      const urlKeyName = `${baseName}_certificate_url`;
      if (accreditedSystems[sys.key]?.certificateUrl) {
        updateData[urlKeyName] = accreditedSystems[sys.key].certificateUrl;
      }
      
      // Save expiry date with correct column name pattern
      const expiryKeyName = `${baseName}_certificate_expiry`;
      const expiryValue = accreditedSystems[sys.key]?.expiryDate;
      
      if (expiryValue) {
        // If it's already in ISO format (yyyy-MM-dd), use as-is
        if (expiryValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          updateData[expiryKeyName] = expiryValue;
        } 
        // If it's in NZ format (dd/mm/yyyy), convert to ISO
        else if (expiryValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const isoDate = parseNZDate(expiryValue);
          updateData[expiryKeyName] = isoDate;
        }
      }
    });

    // Add policies (Section 4)
    updateData.health_safety_policy_exists = policies.health_safety.exists;
    if (policies.health_safety.url) {
      updateData.health_safety_policy_url = policies.health_safety.url;
    }
    
    updateData.environmental_policy_exists = policies.environmental.exists;
    if (policies.environmental.url) {
      updateData.environmental_policy_url = policies.environmental.url;
    }
    
    updateData.drug_alcohol_policy_exists = policies.drug_alcohol.exists;
    if (policies.drug_alcohol.url) {
      updateData.drug_alcohol_policy_url = policies.drug_alcohol.url;
    }
    
    updateData.quality_policy_exists = policies.quality.exists;
    if (policies.quality.url) {
      updateData.quality_policy_url = policies.quality.url;
    }

    // Add Section 4 data (Accident, Incident & Investigation)
    updateData.accident_reporting_exists = section4.accident_reporting.exists;
    updateData.accident_reporting_score = section4.accident_reporting.score;
    if (section4.accident_reporting.evidence) {
      updateData.accident_reporting_evidence_url = section4.accident_reporting.evidence;
    }

    updateData.accident_investigation_exists = section4.accident_investigation.exists;
    updateData.accident_investigation_score = section4.accident_investigation.score;
    if (section4.accident_investigation.evidence) {
      updateData.accident_investigation_evidence_url = section4.accident_investigation.evidence;
    }

    // Add Section 5 data (Health Hazard Management)
    updateData.health_hazard_plan_exists = section5.health_hazard_plan.exists;
    updateData.health_hazard_plan_score = section5.health_hazard_plan.score;
    if (section5.health_hazard_plan.evidence) {
      updateData.health_hazard_plan_evidence_url = section5.health_hazard_plan.evidence;
    }

    updateData.exposure_monitoring_exists = section5.exposure_monitoring.exists;
    updateData.exposure_monitoring_frequency = section5.exposure_monitoring.frequency;
    updateData.exposure_monitoring_score = section5.exposure_monitoring.score;
    if (section5.exposure_monitoring.evidence) {
      updateData.exposure_monitoring_evidence_url = section5.exposure_monitoring.evidence;
    }

    updateData.respiratory_training_exists = section5.respiratory_training.exists;
    updateData.respiratory_training_score = section5.respiratory_training.score;
    if (section5.respiratory_training.evidence) {
      updateData.respiratory_training_evidence_url = section5.respiratory_training.evidence;
    }

    updateData.exhaust_ventilation_exists = section5.exhaust_ventilation.exists;
    updateData.exhaust_ventilation_score = section5.exhaust_ventilation.score;
    if (section5.exhaust_ventilation.evidence) {
      updateData.exhaust_ventilation_evidence_url = section5.exhaust_ventilation.evidence;
    }

    updateData.health_monitoring_exists = section5.health_monitoring.exists;
    updateData.health_monitoring_frequency = section5.health_monitoring.frequency;
    updateData.health_monitoring_score = section5.health_monitoring.score;
    if (section5.health_monitoring.evidence) {
      updateData.health_monitoring_evidence_url = section5.health_monitoring.evidence;
    }

    // Add Section 6 data (Induction & Training)
    Object.entries(section6).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 7 data (Hazard Identification & Management)
    Object.entries(section7).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 8 data (PPE)
    updateData.ppe_compliance_yesno = section8.ppe_compliance_yesno || 'no';
    Object.entries(section8).forEach(([key, value]) => {
      if (key !== 'ppe_compliance_yesno' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        if (value.evidence) {
          updateData[`${key}_evidence_url`] = value.evidence;
        }
      }
    });

    // Add Section 9 data (Plant & Equipment)
    updateData.plant_equipment_onsite_yesno = section9.plant_equipment_onsite_yesno || 'no';
    Object.entries(section9).forEach(([key, value]) => {
      if (key !== 'plant_equipment_onsite_yesno' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        if (value.evidence) {
          updateData[`${key}_evidence_url`] = value.evidence;
        }
      }
    });

    // Add Section 10 data (Electrical Equipment)
    updateData.electrical_equipment_onsite_yesno = section10.electrical_equipment_onsite_yesno || 'no';
    Object.entries(section10).forEach(([key, value]) => {
      if (key !== 'electrical_equipment_onsite_yesno' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        if (value.evidence) {
          updateData[`${key}_evidence_url`] = value.evidence;
        }
      }
    });

    // Add Section 11 data (Emergency Preparedness & Response)
    updateData.emergency_first_aid_yesno = section11.emergency_first_aid_yesno || 'no';
    updateData.emergency_first_aid_equipment = section11.emergency_first_aid_equipment || '';
    Object.entries(section11).forEach(([key, value]) => {
      if (key !== 'emergency_first_aid_yesno' && key !== 'emergency_first_aid_equipment' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        if (value.evidence) {
          updateData[`${key}_evidence_url`] = value.evidence;
        }
      }
    });

    // Add Section 12 data (Site Specific Safety Plans)
    Object.entries(section12).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 13 data (Contractor Management)
    Object.entries(section13).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 14 data (Health & Wellbeing)
    Object.entries(section14).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 21 data (Quality Management)
    Object.entries(section21).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 22 data (Environmental Management)
    Object.entries(section22).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 24 data (Insurance Documents)
    if (section24.public_liability_insurance.expiry_date) {
      updateData.public_liability_insurance_expiry = section24.public_liability_insurance.expiry_date;
    }
    if (section24.public_liability_insurance.url) {
      updateData.public_liability_insurance_url = section24.public_liability_insurance.url;
      updateData.public_liability_insurance_uploaded_at = section24.public_liability_insurance.uploaded_at;
    }
    if (section24.motor_vehicle_insurance.expiry_date) {
      updateData.motor_vehicle_insurance_expiry = section24.motor_vehicle_insurance.expiry_date;
    }
    if (section24.motor_vehicle_insurance.url) {
      updateData.motor_vehicle_insurance_url = section24.motor_vehicle_insurance.url;
      updateData.motor_vehicle_insurance_uploaded_at = section24.motor_vehicle_insurance.uploaded_at;
    }

    // Add Section 25 data (Contact Information)
    if (section25.health_safety_manager.name) {
      updateData.health_safety_manager_name = section25.health_safety_manager.name;
    }
    if (section25.health_safety_manager.email) {
      updateData.health_safety_manager_email = section25.health_safety_manager.email;
    }
    if (section25.health_safety_manager.phone) {
      updateData.health_safety_manager_phone = section25.health_safety_manager.phone;
    }
    if (section25.environmental_manager.name) {
      updateData.environmental_manager_name = section25.environmental_manager.name;
    }
    if (section25.environmental_manager.email) {
      updateData.environmental_manager_email = section25.environmental_manager.email;
    }
    if (section25.environmental_manager.phone) {
      updateData.environmental_manager_phone = section25.environmental_manager.phone;
    }
    if (section25.quality_manager.name) {
      updateData.quality_manager_name = section25.quality_manager.name;
    }
    if (section25.quality_manager.email) {
      updateData.quality_manager_email = section25.quality_manager.email;
    }
    if (section25.quality_manager.phone) {
      updateData.quality_manager_phone = section25.quality_manager.phone;
    }
    if (section25.occupational_hygienist.name) {
      updateData.occupational_hygienist_name = section25.occupational_hygienist.name;
    }
    if (section25.occupational_hygienist.email) {
      updateData.occupational_hygienist_email = section25.occupational_hygienist.email;
    }
    if (section25.occupational_hygienist.phone) {
      updateData.occupational_hygienist_phone = section25.occupational_hygienist.phone;
    }

    // Add Section 15 data (Competency & Qualifications)
    Object.entries(section15).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 16 data (Communication & Reporting)
    Object.entries(section16).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 17 data (Performance & Review)
    Object.entries(section17).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 18 data (Incident Analysis & Learning)
    Object.entries(section18).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    // Add Section 19 data (Continuous Improvement)
    Object.entries(section19).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      if (value.evidence) {
        updateData[`${key}_evidence_url`] = value.evidence;
      }
    });

    return updateData;
  };

  // Auto-save function (silent, no alerts)
  const autoSave = async () => {
    if (!currentCompanyId) return;
    
    try {
      setAutoSaving(true);
      const updateData = buildUpdateData();
      await updateCompanyAccreditation(currentCompanyId, updateData);
      console.log('✨ Auto-saved accreditation data');
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  // Manual save with user feedback
  const handleSave = async () => {
    if (!currentCompanyId) {
      Alert.alert('Error', 'No company selected');
      return;
    }

    setSaving(true);
    try {
      const updateData = buildUpdateData();
      const result = await updateCompanyAccreditation(currentCompanyId, updateData);
      
      console.log('📊 Update result:', result);
      
      
      if (result.success) {
        Alert.alert('Success', 'Accreditation saved successfully');
        loadCompanyData();
      } else {
        Alert.alert('Error', 'Failed to save: ' + result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Save failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Submit accreditation as complete
  const handleSubmitAsComplete = async () => {
    Alert.alert(
      'Submit Accreditation',
      'Are you sure you want to submit this accreditation as complete? You will be able to edit it later if needed.',
      [
        { text: 'Cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSaving(true);
            try {
              const updateData = buildUpdateData('completed');
              const result = await updateCompanyAccreditation(currentCompanyId, updateData);
              
              if (result.success) {
                setAccreditationStatus('completed');
                Alert.alert('Success', 'Accreditation submitted successfully');
                loadCompanyData();
              } else {
                Alert.alert('Error', 'Failed to submit: ' + result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Submit failed: ' + error.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // Auto-save when data changes (debounced)
  useEffect(() => {
    if (!currentCompanyId) return;
    
    const timer = setTimeout(() => {
      autoSave();
    }, 30000); // Auto-save after 30 seconds of inactivity
    
    return () => clearTimeout(timer);
  }, [companyDetails, selectedServices, selectedBusinessUnits, accreditedSystems, policies, section4, section5, section6, section7, section8, section9, section10, section11, section12, section13, section14, section15, section16, section17, section18, section19, section20, section21, section22, section24, section25, currentCompanyId]);

  // Helper function to render sections 4-19
  const renderSections__719 = () => {
    const sections = [
      {
        number: 5,
        title: 'Accident, Incident & Investigation Management',
        state: section4,
        setState: setSection4,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'accident_reporting', question: 'An accident/incident reporting and recording system?' },
          { key: 'accident_investigation', question: 'An accident/investigation process?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 6,
        title: 'Health Hazard Management',
        state: section5,
        setState: setSection5,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'health_hazard_plan', question: 'A Health Hazard Management Plan?' },
          { key: 'exposure_monitoring', question: 'A plan to conduct exposure monitoring?', hasFrequency: true },
          { key: 'respiratory_training', question: 'A programme of training and fit testing for respiratory protection?' },
          { key: 'exhaust_ventilation', question: 'A routine maintenance programme for ventilation systems?' },
          { key: 'health_monitoring', question: 'A health monitoring programme for workers exposed to hazous substances?', hasFrequency: true }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 7,
        title: 'Induction & Training',
        state: section6,
        setState: setSection6,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'induction_programme', question: 'An induction programme?' },
          { key: 'induction_records_process', question: 'A documented induction records management process?' },
          { key: 'skills_training_list', question: 'A Skills & Training List/Matrix identifying required skills for each role?' },
          { key: 'competency_testing_system', question: 'A competency testing/assessment system for staff?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 8,
        title: 'Hazard Identification & Management',
        state: section7,
        setState: setSection7,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'hazard_identification_process', question: 'A process to identify, report and control hazards in the workplace?' },
          { key: 'jha_jsea_system', question: 'A Job Hazard Analysis (JHA), Job Safety & Environmental Analysis (JSEA) system or equivalent?' },
          { key: 'risk_registers', question: 'Risk registers relevant to the workplace?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 9,
        title: 'Personal Protective Equipment (PPE)',
        state: section8,
        setState: setSection8,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'ppe_compliance', question: 'Do you supply your workers with PPE that complies with the AS/NZS Standards?', type: 'yes_no' },
          { key: 'ppe_training_maintenance', question: 'Are staff trained in its correct use, maintenance & storage of their PPE?', type: 'scoring', showIfKey: 'ppe_compliance' },
          { key: 'ppe_job_assessment', question: 'Has your organisation assessed the jobs & tasks that require PPE?', type: 'scoring', showIfKey: 'ppe_compliance' },
          { key: 'ppe_maintenance_schedule', question: 'Do you have a maintenance schedule and register of specialised PPE, i.e., gas detectors?', type: 'scoring', showIfKey: 'ppe_compliance' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 10,
        title: 'Plant & Equipment',
        state: section9,
        setState: setSection9,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'plant_equipment_onsite', question: 'Will you be bringing any plant / equipment onto our sites or use heavy vehicles to transport goods on our behalf?', type: 'yes_no' },
          { key: 'plant_equipment_licenses', question: 'Do you ensure your workers receive training and have the correct licences and/or certificates to operate the plant and equipment they use?', type: 'scoring', showIfKey: 'plant_equipment_onsite' },
          { key: 'plant_equipment_safety_provisions', question: 'Do you ensure that all plant and equipment are fitted with the correct and legal safety provisions (e.g. rollover protection or seat belts)?', type: 'scoring', showIfKey: 'plant_equipment_onsite' },
          { key: 'plant_equipment_maintenance', question: 'Is equipment well maintained and are records kept of equipment maintenance, calibration and service?', type: 'scoring', showIfKey: 'plant_equipment_onsite' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 11,
        title: 'Electrical Equipment',
        state: section10,
        setState: setSection10,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'electrical_equipment_onsite', question: 'Will you be bringing any electrical equipment on site?', type: 'yes_no' },
          { key: 'electrical_equipment_testing', question: 'Does your organisation check and test equipment to ensure it is fit for purpose (e.g. tagging of electrical devices)?', type: 'scoring', showIfKey: 'electrical_equipment_onsite' },
          { key: 'electrical_equipment_licenses', question: 'Do you ensure your workers receive training and have the correct licences and/or certificates to operate the electrical equipment they use?', type: 'scoring', showIfKey: 'electrical_equipment_onsite' },
          { key: 'electrical_equipment_safety_provisions', question: 'Do you ensure that all electrical equipment are fitted with the correct and legal safety provisions (e.g. rollover protection or seat belts)?', type: 'scoring', showIfKey: 'electrical_equipment_onsite' },
          { key: 'electrical_equipment_maintenance', question: 'Is equipment well maintained and are records kept of equipment maintenance, calibration and service?', type: 'scoring', showIfKey: 'electrical_equipment_onsite' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 12,
        title: 'Emergency Preparedness & Response',
        state: section11,
        setState: setSection11,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'emergency_procedures', question: 'Does your organisation have emergency response procedures to deal with work-site emergencies?', type: 'scoring' },
          { key: 'emergency_first_aid', question: 'Will your company provide the necessary first aid equipment to deal with emergencies on site?', type: 'yes_no' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 13,
        title: 'Site Specific Safety Plans',
        state: section12,
        setState: setSection12,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'site_safety_plans', question: 'Does your organisation have site-specific safety plans for all work undertaken at our locations?' },
          { key: 'site_induction_process', question: 'Do you have a documented site induction process for staff and contractors working at our locations?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 14,
        title: 'Contractor Management',
        state: section13,
        setState: setSection13,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'contractor_induction', question: 'Do you ensure all contractors working on your behalf receive appropriate induction and training before starting work?' },
          { key: 'contractor_compliance', question: 'Do you monitor and ensure contractors comply with your health and safety requirements?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 15,
        title: 'Health & Wellbeing',
        state: section14,
        setState: setSection14,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'health_wellbeing_program', question: 'Does your organisation have a health and wellbeing program for workers?' },
          { key: 'fatigue_management', question: 'Do you have procedures for managing worker fatigue and ensuring adequate rest periods?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 16,
        title: 'Competency & Qualifications',
        state: section15,
        setState: setSection15,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'competency_framework', question: 'Does your organisation have a documented competency framework for all roles?' },
          { key: 'training_records', question: 'Do you maintain comprehensive training and competency records for all workers?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 17,
        title: 'Communication & Reporting',
        state: section16,
        setState: setSection16,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'safety_communication', question: 'Does your organisation have consistent and effective safety communication systems with workers?' },
          { key: 'near_miss_reporting', question: 'Do you have a system for reporting and investigating near-miss incidents?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 18,
        title: 'Performance & Review',
        state: section17,
        setState: setSection17,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'performance_monitoring', question: 'Does your organisation regularly monitor safety performance and key performance indicators?' },
          { key: 'regular_audits', question: 'Do you conduct regular safety audits and inspections of your operations?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 19,
        title: 'Injury Management',
        state: section18,
        setState: setSection18,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'injury_management', question: 'Do you have an injury management procedure and system in place?' },
          { key: 'early_intervention', question: 'Do you have an Early Intervention programme for Pain and Discomfort in place?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 20,
        title: 'Continuous Improvement',
        state: section19,
        setState: setSection19,
        isConditional: true,
        conditionalKeys: ['aep_accredited', 'iso_45001_certified', 'totika_prequalified', 'she_prequal_qualified', 'impac_prequalified', 'sitewise_prequalified', 'rapid_prequalified'],
        conditionalShowWhen: false, // Hide when any of these accreditations are checked
        items: [
          { key: 'safety_objectives', question: 'Does your organisation have documented safety objectives and targets?' },
          { key: 'management_review', question: 'Does management regularly review and update health and safety policies and procedures?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 23,
        title: 'Incidents & Breaches',
        state: section20,
        setState: setSection20,
        items: [
          { key: 'incidents_breaches', question: 'Has your organisation had any of the following accidents/incidents in the past 12 months?', type: 'incidents_table' }
        ],
        scoringCriteria: {
          1: '>1 LTI / Fatality in 5 years; insufficient info provided.',
          2: '1 MTI / LTI / Fatality in 5 years; rate not improving.',
          3: 'Only First Aid incidents; minor improvement only.',
          4: '0 incidents in 5 years; strong near-miss reporting; >20% annual improvement.'
        },
        alwaysShow: true
      },
      {
        number: 21,
        title: 'Quality Management',
        state: section21,
        setState: setSection21,
        isConditional: true,
        conditionalKey: 'iso_9001_certified',
        conditionalShowWhen: false,
        items: [
          { key: 'quality_manager_and_plan', question: 'Does your organisation have a dedicated Quality Manager, if not who in your company is responsible for Quality Assurance? (provide name and role). Does your organisation have a Quality Management Plan?' },
          { key: 'roles_and_responsibilities', question: 'Are roles and responsibilities (i.e. who, when, how and review) identified?' },
          { key: 'purchasing_procedures', question: 'Are procedures for purchasing adequately identified, including: Sources of materials, Procedures for inspection and test of incoming materials, Compliance with suppliers recommendations, Provision of SDS and safety information, Evidence and verification of quality control checks' },
          { key: 'subcontractor_evaluation', question: 'Are procedures for evaluation of subcontractor\'s ability to meet specification requirements and for monitoring quality of subcontract works defined?' },
          { key: 'process_control_plan', question: 'Is there a process control plan for your company\'s activities that identifies: The process steps, Factors affecting quality, Methods to monitor process, Acceptability criteria and verification procedure, Activities requiring independent inspection or witness points' },
          { key: 'nonconformance_procedure', question: 'Is there a procedure for nonconformances and tests in accordance with defined acceptance criteria, including recording and follow-up analysis and improvement?' },
          { key: 'product_rejection', question: 'Have you ever had product/project rejected that required significant rework or programme impact? (if yes, please explain)' },
          { key: 'personnel_induction', question: 'Is there a process for ensuring that all personnel have undergone appropriate induction and training to deliver agreed customer requirements?' },
          { key: 'internal_audits', question: 'Does your organisation undertake regular internal work site, health, safety, environmental and quality inspections and audits?' },
          { key: 'continuous_improvement', question: 'Do you implement continuous improvement in your quality processes? (if yes, please provide evidence)' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      },
      {
        number: 22,
        title: 'Environmental Management',
        state: section22,
        setState: setSection22,
        isConditional: true,
        conditionalKey: 'iso_14001_certified',
        conditionalShowWhen: false,
        items: [
          { key: 'environmental_aspects_assessment', question: 'Has your company formally assessed the significant environmental aspects of its activities and associated risks and impacts of these on the environment?' },
          { key: 'environmental_system_and_plans', question: 'Does your company have a documented Environmental System and/or Environmental Plans?' },
          { key: 'waste_management_policy', question: 'Does the company have a specific policy or action plan relating to managing waste?' },
          { key: 'environmental_improvement_targets', question: 'Has your company set targets for environmental improvements, for example, sustainable purchasing, carbon footprint, cleaner production etc?' },
          { key: 'environmental_training_programme', question: 'Has your company set up a programme for training workers on environmental issues?' }
        ],
        scoringCriteria: {
          1: 'Minimal/informal processes; no written procedures',
          2: 'Basic systems exist; assigned responsibilities',
          3: 'Formal systems in place; consistent application; structured communication',
          4: 'Comprehensive systems embedded; proactive & collaborative; continuous improvement'
        }
      }
    ];

    return sections.map(section => {
      // Skip section 20 here - it will be rendered separately and always visible
      if (section.alwaysShow) return null;
      
      // Handle conditional sections based on accreditation systems
      if (section.isConditional) {
        // Handle sections with multiple conditional keys (4-19)
        if (section.conditionalKeys && section.conditionalKeys.length > 0) {
          const anySystemChecked = section.conditionalKeys.some(key => accreditedSystems[key]?.checked || false);
          const shouldShow = section.conditionalShowWhen ? anySystemChecked : !anySystemChecked;
          if (!shouldShow) return null;
        } 
        // Handle sections with single conditional key (21, 22)
        else if (section.conditionalKey) {
          const isSystemChecked = accreditedSystems[section.conditionalKey]?.checked || false;
          const shouldShow = section.conditionalShowWhen ? isSystemChecked : !isSystemChecked;
          if (!shouldShow) return null;
        }
      }
      
      return (
      <View key={section.number}>
        <TouchableOpacity
          onPress={() => setExpandedSections(prev => ({ ...prev, [section.number]: !prev[section.number] }))}
          style={{
            backgroundColor: '#F0F9FF',
            borderWidth: 2,
            borderColor: '#0284C7',
            borderRadius: 8,
            paddingVertical: 14,
            paddingHorizontal: 14,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
            Section {section.number}: {section.title}
          </Text>
          <Text style={{ fontSize: 18, color: '#0284C7' }}>
            {expandedSections[section.number] ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections[section.number] && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 20, marginBottom: 12, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12 }}>
            {/* Scoring Criteria Table */}
            <View style={{ marginBottom: 16, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5DB' }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6' }}>
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#1F2937', textAlign: 'center' }}>1</Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#1F2937', textAlign: 'center' }}>2</Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#1F2937', textAlign: 'center' }}>3</Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#1F2937', textAlign: 'center' }}>4</Text>
                </View>
              </View>
              
              {/* Color row with backgrounds */}
              <View style={{ flexDirection: 'row', height: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#FECACA', borderRightWidth: 1, borderRightColor: '#D1D5DB' }} />
                <View style={{ flex: 1, backgroundColor: '#FED7AA', borderRightWidth: 1, borderRightColor: '#D1D5DB' }} />
                <View style={{ flex: 1, backgroundColor: '#BBEF63', borderRightWidth: 1, borderRightColor: '#D1D5DB' }} />
                <View style={{ flex: 1, backgroundColor: '#22C55E' }} />
              </View>
              
              {/* Criteria row */}
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 9, color: '#374151', lineHeight: 13 }}>
                    {section.scoringCriteria ? section.scoringCriteria[1] : '1: Minimal/informal processes; no written procedures'}
                  </Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 9, color: '#374151', lineHeight: 13 }}>
                    {section.scoringCriteria ? section.scoringCriteria[2] : '2: Basic systems exist; assigned responsibilities'}
                  </Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 9, color: '#374151', lineHeight: 13 }}>
                    {section.scoringCriteria ? section.scoringCriteria[3] : '3: Formal systems in place; consistent application; structured communication'}
                  </Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 9, color: '#374151', lineHeight: 13 }}>
                    {section.scoringCriteria ? section.scoringCriteria[4] : '4: Comprehensive systems embedded; proactive & collaborative; continuous improvement'}
                  </Text>
                </View>
              </View>
            </View>

            {section.items.map((item, idx) => {
              // Check if this item should be shown (conditional rendering)
              if (item.showIfKey && section.state[item.showIfKey] !== 'yes') {
                return null;
              }

              if (item.type === 'yes_no') {
                // Yes/No question
                return (
                  <View key={idx} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        {item.question}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => section.setState(prev => ({
                            ...prev,
                            [item.key]: 'yes'
                          }))}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderRadius: 6,
                            backgroundColor: section.state[item.key] === 'yes' ? '#10B981' : '#E5E7EB',
                            borderWidth: section.state[item.key] === 'yes' ? 2 : 1,
                            borderColor: section.state[item.key] === 'yes' ? '#059669' : '#D1D5DB'
                          }}
                        >
                          <Text style={{ color: section.state[item.key] === 'yes' ? 'white' : '#1F2937', fontWeight: '600', fontSize: 13 }}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => section.setState(prev => ({
                            ...prev,
                            [item.key]: 'no'
                          }))}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderRadius: 6,
                            backgroundColor: section.state[item.key] === 'no' ? '#EF4444' : '#E5E7EB',
                            borderWidth: section.state[item.key] === 'no' ? 2 : 1,
                            borderColor: section.state[item.key] === 'no' ? '#DC2626' : '#D1D5DB'
                          }}
                        >
                          <Text style={{ color: section.state[item.key] === 'no' ? 'white' : '#1F2937', fontWeight: '600', fontSize: 13 }}>No</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Special cases: Section 11 Q2 - text input for first aid equipment */}
                    {section.number === 11 && item.key === 'emergency_first_aid' && section.state[item.key] === 'yes' && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>Please specify the first aid equipment you will provide:</Text>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: '#D1D5DB',
                            borderRadius: 6,
                            padding: 10,
                            fontSize: 13,
                            minHeight: 100,
                            textAlignVertical: 'top'
                          }}
                          multiline
                          placeholder="Enter details of first aid equipment..."
                          value={section.state.emergency_first_aid_equipment || ''}
                          onChangeText={(text) => section.setState(prev => ({
                            ...prev,
                            emergency_first_aid_equipment: text
                          }))}
                        />
                      </View>
                    )}
                  </View>
                );
              } else {
                // Scoring question
                const evidenceUIKey = `section${section.number}-${item.key}`;
                const isEvidenceUIExpanded = expandedEvidenceUI === evidenceUIKey;
                
                return (
                  <View key={idx} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        {item.question}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => section.setState(prev => ({
                              ...prev,
                              [item.key]: { ...prev[item.key], score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FECACA' : score === 2 ? '#FED7AA' : score === 3 ? '#BBEF63' : '#22C55E',
                              borderWidth: section.state[item.key]?.score === score ? 3 : 1,
                              borderColor: section.state[item.key]?.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section.state[item.key]?.score === score && score > 1 && (
                              <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                        {renderEvidenceToggle(section.number, item.key, section.state[item.key], item.question)}
                      </View>
                    </View>
                    
                    {/* Expanded Evidence UI - shown below scores */}
                    {expandedEvidenceUI === `section${section.number}-${item.key}` && (
                      <View style={{ marginBottom: 12, marginTop: 12 }}>
                        {renderDocumentToggle(`section${section.number}-${item.key}`, section.state[item.key], item.question, () => handleUploadEvidence(`section${section.number}`, item.key, item.question), null, 'Evidence', false)}
                      </View>
                    )}

                    {/* Frequency selector for exposure_monitoring and health_monitoring */}
                    {item.hasFrequency && section.state[item.key]?.score > 0 && (
                      <View style={{ paddingLeft: 0, marginTop: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Frequency (years):</Text>
                        <View style={{ flexDirection: 'row' }}>
                          {[1, 2, 3, 4, 5].map(freq => (
                            <TouchableOpacity
                              key={freq}
                              onPress={() => section.setState(prev => ({
                                ...prev,
                                [item.key]: { ...prev[item.key], frequency: freq }
                              }))}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 4,
                                backgroundColor: section.state[item.key]?.frequency === freq ? '#3B82F6' : '#E5E7EB',
                                marginRight: 6
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '600', color: section.state[item.key]?.frequency === freq ? 'white' : '#374151' }}>
                                {freq}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    
                  </View>
                );
              }
            })}
          </View>
        )}
      </View>
      );
    });
  };

  const renderSection20 = () => {
    // Section 23: Incidents & Breaches - Always visible (simplified version)
    return (
      <View key={23}>
        <TouchableOpacity
          onPress={() => setExpandedSections(prev => ({ ...prev, 23: !prev[23] }))}
          style={{
            backgroundColor: '#F0F9FF',
            borderWidth: 2,
            borderColor: '#0284C7',
            borderRadius: 8,
            paddingVertical: 14,
            paddingHorizontal: 14,
            marginBottom: 12,
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
            Section 23: Incidents & Breaches
          </Text>
          <Text style={{ fontSize: 18, color: '#0284C7' }}>
            {expandedSections[23] ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections[23] && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 20, marginBottom: 12, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12 }}>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#1F2937', marginBottom: 12 }}>
                Has your organisation had any of the following accidents/incidents in the past 12 months?
              </Text>
            </View>

            {/* Incident Form - Simplified */}
            <View style={{ gap: 16 }}>
              {/* Fatalities */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Fatalities, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, width: 80 }}
                  placeholder="Number"
                  keyboardType="numeric"
                  value={section20.incidents_breaches.fatalities}
                  onChangeText={(text) => setSection20(prev => ({
                    ...prev,
                    incidents_breaches: { ...prev.incidents_breaches, fatalities: text }
                  }))}
                />
              </View>

              {/* Serious Harm */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Serious Harm Incidents, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, width: 80 }}
                  placeholder="Number"
                  keyboardType="numeric"
                  value={section20.incidents_breaches.serious_harm}
                  onChangeText={(text) => setSection20(prev => ({
                    ...prev,
                    incidents_breaches: { ...prev.incidents_breaches, serious_harm: text }
                  }))}
                />
              </View>

              {/* Lost Time Injuries */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Lost Time Injuries, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, width: 80 }}
                  placeholder="Number"
                  keyboardType="numeric"
                  value={section20.incidents_breaches.lost_time}
                  onChangeText={(text) => setSection20(prev => ({
                    ...prev,
                    incidents_breaches: { ...prev.incidents_breaches, lost_time: text }
                  }))}
                />
              </View>

              {/* Property Damage */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Incidents causing property damage during a contract, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, width: 80 }}
                  placeholder="Number"
                  keyboardType="numeric"
                  value={section20.incidents_breaches.property_damage}
                  onChangeText={(text) => setSection20(prev => ({
                    ...prev,
                    incidents_breaches: { ...prev.incidents_breaches, property_damage: text }
                  }))}
                />
              </View>

              {/* Pending Prosecutions */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Does your organisation have any pending workplace health, safety and environmental prosecutions or improvement notices, issued by the Work, Health and Safety or Environmental regulators?</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSection20(prev => ({
                      ...prev,
                      incidents_breaches: { ...prev.incidents_breaches, pending_prosecutions: 'yes' }
                    }))}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: section20.incidents_breaches?.pending_prosecutions === 'yes' ? '#0284C7' : '#D1D5DB',
                      backgroundColor: section20.incidents_breaches?.pending_prosecutions === 'yes' ? '#0284C7' : 'white',
                      marginRight: 4,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {section20.incidents_breaches?.pending_prosecutions === 'yes' && (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#1F2937' }}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSection20(prev => ({
                      ...prev,
                      incidents_breaches: { ...prev.incidents_breaches, pending_prosecutions: 'no' }
                    }))}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: section20.incidents_breaches?.pending_prosecutions === 'no' ? '#0284C7' : '#D1D5DB',
                      backgroundColor: section20.incidents_breaches?.pending_prosecutions === 'no' ? '#0284C7' : 'white',
                      marginRight: 4,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {section20.incidents_breaches?.pending_prosecutions === 'no' && (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#1F2937' }}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Past 5 Years Prosecutions */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>In the past 5 years, how many workplace, health, safety and environmental prosecutions or improvement notices have been issued to the organisation?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, width: 80 }}
                  placeholder="Number"
                  keyboardType="numeric"
                  value={section20.incidents_breaches.prosecutions_5_years}
                  onChangeText={(text) => setSection20(prev => ({
                    ...prev,
                    incidents_breaches: { ...prev.incidents_breaches, prosecutions_5_years: text }
                  }))}
                />
              </View>

              {/* Environmental Enforcement Notices - adding this question from the image */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Had any infringement, abatement or enforcement notices served on it by an environmental regulator or authority?</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSection20(prev => ({
                      ...prev,
                      incidents_breaches: { ...prev.incidents_breaches, environmental_notices: 'yes' }
                    }))}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: section20.incidents_breaches?.environmental_notices === 'yes' ? '#0284C7' : '#D1D5DB',
                      backgroundColor: section20.incidents_breaches?.environmental_notices === 'yes' ? '#0284C7' : 'white',
                      marginRight: 4,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {section20.incidents_breaches?.environmental_notices === 'yes' && (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#1F2937' }}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSection20(prev => ({
                      ...prev,
                      incidents_breaches: { ...prev.incidents_breaches, environmental_notices: 'no' }
                    }))}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: section20.incidents_breaches?.environmental_notices === 'no' ? '#0284C7' : '#D1D5DB',
                      backgroundColor: section20.incidents_breaches?.environmental_notices === 'no' ? '#0284C7' : 'white',
                      marginRight: 4,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {section20.incidents_breaches?.environmental_notices === 'no' && (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#1F2937' }}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderInsuranceSection = () => {
    return (
      <View key={24}>
        <TouchableOpacity
          onPress={() => setExpandedSections(prev => ({ ...prev, 24: !prev[24] }))}
          style={{
            backgroundColor: '#F0F9FF',
            borderWidth: 2,
            borderColor: '#0284C7',
            borderRadius: 8,
            paddingVertical: 14,
            paddingHorizontal: 14,
            marginBottom: 12,
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
            Section 24: Insurance Documents
          </Text>
          <Text style={{ fontSize: 18, color: '#0284C7' }}>
            {expandedSections[24] ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections[24] && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 20, marginBottom: 12, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12 }}>
            {/* Public Liability Insurance (Compulsory) */}
            <View style={{ marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1 }}>
                  Public Liability Insurance
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', backgroundColor: '#DC2626', color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  COMPULSORY
                </Text>
              </View>

              {/* Expiry Date */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Expiry Date (dd/mm/yyyy)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: section24.public_liability_insurance.expiry_date ? '#10B981' : '#E5E7EB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937',
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="dd/mm/yyyy (e.g., 25/12/2026)"
                  value={section24.public_liability_insurance.expiry_date}
                  onChangeText={(text) => setSection24(prev => ({
                    ...prev,
                    public_liability_insurance: {
                      ...prev.public_liability_insurance,
                      expiry_date: text
                    }
                  }))}
                  keyboardType="numeric"
                />
              </View>

              {/* Document Upload */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Insurance Certificate
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 2,
                    borderColor: section24.public_liability_insurance.has_document ? '#10B981' : '#D1D5DB',
                    borderStyle: 'dashed',
                    borderRadius: 6,
                    padding: 16,
                    alignItems: 'center',
                    backgroundColor: section24.public_liability_insurance.has_document ? '#F0FDF4' : '#F9FAFB'
                  }}
                  onPress={() => handleUploadInsuranceDocument('pli', 'Public Liability Insurance')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0284C7', marginBottom: 4 }}>
                    {section24.public_liability_insurance.has_document ? '✓ Document Uploaded' : '+ Upload Certificate'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>
                    PDF or image file
                  </Text>
                </TouchableOpacity>
                {section24.public_liability_insurance.has_document && (
                  <TouchableOpacity
                    style={{ marginTop: 8, paddingVertical: 6 }}
                    onPress={() => handleDeleteInsuranceDocument('pli', 'Public Liability Insurance')}
                  >
                    <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>
                      🗑️ Remove Document
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Motor Vehicle Insurance (Optional) */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1 }}>
                  Motor Vehicle Insurance
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', backgroundColor: '#9CA3AF', color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  OPTIONAL
                </Text>
              </View>

              {/* Expiry Date */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Expiry Date (dd/mm/yyyy)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: section24.motor_vehicle_insurance.expiry_date ? '#10B981' : '#E5E7EB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937',
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="dd/mm/yyyy (optional)"
                  value={section24.motor_vehicle_insurance.expiry_date}
                  onChangeText={(text) => setSection24(prev => ({
                    ...prev,
                    motor_vehicle_insurance: {
                      ...prev.motor_vehicle_insurance,
                      expiry_date: text
                    }
                  }))}
                  keyboardType="numeric"
                />
              </View>

              {/* Document Upload */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Insurance Certificate
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 2,
                    borderColor: section24.motor_vehicle_insurance.has_document ? '#10B981' : '#D1D5DB',
                    borderStyle: 'dashed',
                    borderRadius: 6,
                    padding: 16,
                    alignItems: 'center',
                    backgroundColor: section24.motor_vehicle_insurance.has_document ? '#F0FDF4' : '#F9FAFB'
                  }}
                  onPress={() => handleUploadInsuranceDocument('mvi', 'Motor Vehicle Insurance')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0284C7', marginBottom: 4 }}>
                    {section24.motor_vehicle_insurance.has_document ? '✓ Document Uploaded' : '+ Upload Certificate'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>
                    PDF or image file (optional)
                  </Text>
                </TouchableOpacity>
                {section24.motor_vehicle_insurance.has_document && (
                  <TouchableOpacity
                    style={{ marginTop: 8, paddingVertical: 6 }}
                    onPress={() => handleDeleteInsuranceDocument('mvi', 'Motor Vehicle Insurance')}
                  >
                    <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>
                      🗑️ Remove Document
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderContactInfoSection = () => {
    const renderContactFields = (role, roleKey) => (
      <View style={{ marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
          {role}
        </Text>

        {/* Name */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Full Name
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: section25[roleKey].name ? '#10B981' : '#E5E7EB',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: '#1F2937',
              backgroundColor: '#F9FAFB'
            }}
            placeholder="Enter full name"
            value={section25[roleKey].name}
            onChangeText={(text) => setSection25(prev => ({
              ...prev,
              [roleKey]: { ...prev[roleKey], name: text }
            }))}
          />
        </View>

        {/* Email */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Email Address
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: section25[roleKey].email ? '#10B981' : '#E5E7EB',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: '#1F2937',
              backgroundColor: '#F9FAFB'
            }}
            placeholder="Enter email address"
            keyboardType="email-address"
            value={section25[roleKey].email}
            onChangeText={(text) => setSection25(prev => ({
              ...prev,
              [roleKey]: { ...prev[roleKey], email: text }
            }))}
          />
        </View>

        {/* Phone */}
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Telephone Number
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: section25[roleKey].phone ? '#10B981' : '#E5E7EB',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: '#1F2937',
              backgroundColor: '#F9FAFB'
            }}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            value={section25[roleKey].phone}
            onChangeText={(text) => setSection25(prev => ({
              ...prev,
              [roleKey]: { ...prev[roleKey], phone: text }
            }))}
          />
        </View>
      </View>
    );

    return (
      <View key={25}>
        <TouchableOpacity
          onPress={() => setExpandedSections(prev => ({ ...prev, 25: !prev[25] }))}
          style={{
            backgroundColor: '#F0F9FF',
            borderWidth: 2,
            borderColor: '#0284C7',
            borderRadius: 8,
            paddingVertical: 14,
            paddingHorizontal: 14,
            marginBottom: 12,
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
            Section 25: Contact Information
          </Text>
          <Text style={{ fontSize: 18, color: '#0284C7' }}>
            {expandedSections[25] ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections[25] && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 20, marginBottom: 12, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12 }}>
            {renderContactFields('Health and Safety Manager', 'health_safety_manager')}
            {renderContactFields('Environmental Manager', 'environmental_manager')}
            {renderContactFields('Quality Manager', 'quality_manager')}
            {renderContactFields('Occupational Hygienist', 'occupational_hygienist')}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { flex: 1 }]}>
      <ScrollView 
        ref={scrollViewRef}
        style={[styles.screenContainer, { flex: 1 }]}
        contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Company Information Section */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>Company & Contact Information</Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={companyDetails.companyName}
                onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, companyName: text }))}
                placeholder="Company name"
                editable={true}
                pointerEvents="auto"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Company Email</Text>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={companyDetails.companyEmail}
                onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, companyEmail: text }))}
                placeholder="Company email"
                keyboardType="email-address"
                editable={true}
                pointerEvents="auto"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Primary Contact Name</Text>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={companyDetails.contactName}
                onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, contactName: text }))}
                placeholder="Contact first name"
                editable={true}
                pointerEvents="auto"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Primary Contact Surname</Text>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={companyDetails.contactSurname}
                onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, contactSurname: text }))}
                placeholder="Contact surname"
                editable={true}
                pointerEvents="auto"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Primary Contact Email</Text>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={companyDetails.contactEmail}
                onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, contactEmail: text }))}
                placeholder="Contact email"
                keyboardType="email-address"
                editable={true}
                pointerEvents="auto"
              />
            </View>

            <View style={{ marginBottom: 0 }}>
              <Text style={styles.label}>Primary Contact Phone</Text>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={companyDetails.contactPhone}
                onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, contactPhone: text }))}
                placeholder="Contact phone number"
                keyboardType="phone-pad"
                editable={true}
                pointerEvents="auto"
              />
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Please verify or update the above information as needed</Text>
            </View>
          </View>

        {/* Section Navigation */}
        {/* Collapsible Sections */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {/* SECTION 1: Services */}
          <TouchableOpacity
            onPress={() => toggleSection(1)}
            style={{
              backgroundColor: '#F0F9FF',
              borderWidth: 2,
              borderColor: '#0284C7',
              borderRadius: 8,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
              Section 1: Services
            </Text>
            <Text style={{ fontSize: 18, color: '#0284C7' }}>
              {expandedSections[1] ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections[1] && (
            <View style={{ paddingHorizontal: 0, paddingBottom: 20, marginBottom: 12 }}>
              <Text style={[styles.label, { margin: 12, marginBottom: 16 }]}>Which services will you perform on our site?</Text>
              {services.length > 0 ? (
                services.map(service => (
                  <View key={service.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} pointerEvents="auto">
                    <CheckBox
                      value={selectedServices[service.id] || false}
                      onValueChange={() => handleServiceToggle(service.id)}
                      style={{ marginRight: 12 }}
                      pointerEvents="auto"
                    />
                    <Text style={{ flex: 1, fontSize: 14, color: '#1F2937' }}>{service.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', marginHorizontal: 12 }}>
                  Loading services...
                </Text>
              )}
            </View>
          )}

          {/* SECTION 2: Business Units */}
          <TouchableOpacity
            onPress={() => toggleSection(2)}
            style={{
              backgroundColor: '#F0F9FF',
              borderWidth: 2,
              borderColor: '#0284C7',
              borderRadius: 8,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
              Section 2: Business Units
            </Text>
            <Text style={{ fontSize: 18, color: '#0284C7' }}>
              {expandedSections[2] ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections[2] && (
            <View style={{ paddingHorizontal: 0, paddingBottom: 20, marginBottom: 12 }}>
              <Text style={[styles.label, { margin: 12, marginBottom: 12 }]}>
                Which business units do you work for?
              </Text>
              {businessUnits.length > 0 ? (
                businessUnits.map(unit => (
                  <View key={unit.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} pointerEvents="auto">
                    <CheckBox
                      value={selectedBusinessUnits[unit.id] || false}
                      onValueChange={() => handleBusinessUnitToggle(unit.id)}
                      style={{ marginRight: 12 }}
                      pointerEvents="auto"
                    />
                    <Text style={{ flex: 1, fontSize: 14, color: '#1F2937' }}>{unit.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', marginHorizontal: 12 }}>
                  Loading business units...
                </Text>
              )}
            </View>
          )}

          {/* SECTION 3: Accreditation Systems */}
          <TouchableOpacity
            onPress={() => toggleSection(3)}
            style={{
              backgroundColor: '#F0F9FF',
              borderWidth: 2,
              borderColor: '#0284C7',
              borderRadius: 8,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
              Section 3: Accreditation Systems
            </Text>
            <Text style={{ fontSize: 18, color: '#0284C7' }}>
              {expandedSections[3] ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections[3] && (
            <View style={{ paddingHorizontal: 0, paddingBottom: 20, marginBottom: 12 }}>
              <Text style={[styles.label, { margin: 12, marginBottom: 12 }]}>
                Accreditation Systems
              </Text>
              {ACCREDITED_SYSTEMS.map(system => (
                <View key={system.key} style={{ marginBottom: 20, paddingHorizontal: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} pointerEvents="auto">
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} pointerEvents="auto">
                    <CheckBox
                      value={accreditedSystems[system.key]?.checked || false}
                      onValueChange={() => handleAccreditationToggle(system.key)}
                      style={{ marginRight: 12 }}
                      pointerEvents="auto"
                    />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                      {system.label}
                    </Text>
                  </View>

                  {accreditedSystems[system.key]?.checked && (
                    <View style={{ paddingLeft: 36 }}>
                      <Text style={styles.label}>Expiry Date (dd/mm/yyyy):</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="dd/mm/yyyy (e.g., 25/12/2025)"
                        placeholderTextColor="#9CA3AF"
                        value={accreditedSystems[system.key]?.expiryDate || ''}
                        onChangeText={(text) => handleExpiryDateInput(system.key, text)}
                        onBlur={() => {
                          // Convert and validate when user leaves the field
                          const rawDate = accreditedSystems[system.key]?.expiryDate || '';
                          if (rawDate && rawDate.length === 10 && rawDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            const isoDate = parseNZDate(rawDate);
                            setAccreditedSystems(prev => ({
                              ...prev,
                              [system.key]: {
                                ...prev[system.key],
                                expiryDate: isoDate
                              }
                            }));
                          }
                        }}
                        pointerEvents="auto"
                        editable={true}
                        keyboardType="numeric"
                      />
                      
                      {/* Certificate Management - Using unified toggle */}
                      {renderDocumentToggle(
                        `certificate-${system.key}`,
                        accreditedSystems[system.key],
                        system.label,
                        () => handleUploadCertificate(system.key, system.label),
                        () => handleDeleteCertificate(system.key, system.label),
                        'Certificate'
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* SECTION 4: Policies - Only show if NO accreditation systems selected */}
          {!Object.values(accreditedSystems).some(sys => sys.checked) && (
            <>
              <TouchableOpacity
                onPress={() => toggleSection(4)}
                style={{
                  backgroundColor: '#F0F9FF',
                  borderWidth: 2,
                  borderColor: '#0284C7',
                  borderRadius: 8,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 4
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0284C7' }}>
                  Section 4: Policies
                </Text>
                <Text style={{ fontSize: 18, color: '#0284C7' }}>
                  {expandedSections[4] ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedSections[4] && (
                <View style={{ paddingHorizontal: 0, paddingBottom:  20, marginBottom: 12 }}>
                  <Text style={[styles.label, { margin: 12, marginBottom: 16 }]}>
                    Does your organisation have the following policies?
                  </Text>

                  {/* Health and Safety Policy */}
                  <View style={{ marginBottom: 16, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <CheckBox
                        value={policies.health_safety.exists}
                        onValueChange={() => setPolicies(prev => ({
                          ...prev,
                          health_safety: { ...prev.health_safety, exists: !prev.health_safety.exists }
                        }))}
                        style={{ marginRight: 12 }}
                        pointerEvents="auto"
                      />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                        Health and Safety Policy
                      </Text>
                    </View>

                    {policies.health_safety.exists && (
                      <View style={{ paddingLeft: 36 }}>
                        {renderDocumentToggle(
                          'policy-health_safety',
                          policies.health_safety,
                          'Health and Safety Policy',
                          () => handleUploadPolicy('health_safety', 'Health and Safety Policy'),
                          () => handleDeletePolicy('health_safety', 'Health and Safety Policy'),
                          'Document'
                        )}
                      </View>
                    )}
                  </View>

                  {/* Environmental Policy */}
                  <View style={{ marginBottom: 16, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <CheckBox
                        value={policies.environmental.exists}
                        onValueChange={() => setPolicies(prev => ({
                          ...prev,
                          environmental: { ...prev.environmental, exists: !prev.environmental.exists }
                        }))}
                        style={{ marginRight: 12 }}
                        pointerEvents="auto"
                      />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                        Environmental Policy
                      </Text>
                    </View>

                    {policies.environmental.exists && (
                      <View style={{ paddingLeft: 36 }}>
                        {renderDocumentToggle(
                          'policy-environmental',
                          policies.environmental,
                          'Environmental Policy',
                          () => handleUploadPolicy('environmental', 'Environmental Policy'),
                          () => handleDeletePolicy('environmental', 'Environmental Policy'),
                          'Document'
                        )}
                      </View>
                    )}
                  </View>

                  {/* Drug and Alcohol Policy */}
                  <View style={{ marginBottom: 16, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <CheckBox
                        value={policies.drug_alcohol.exists}
                        onValueChange={() => setPolicies(prev => ({
                          ...prev,
                          drug_alcohol: { ...prev.drug_alcohol, exists: !prev.drug_alcohol.exists }
                        }))}
                        style={{ marginRight: 12 }}
                        pointerEvents="auto"
                      />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                        Drug and Alcohol Policy
                      </Text>
                    </View>

                    {policies.drug_alcohol.exists && (
                      <View style={{ paddingLeft: 36 }}>
                        {renderDocumentToggle(
                          'policy-drug_alcohol',
                          policies.drug_alcohol,
                          'Drug and Alcohol Policy',
                          () => handleUploadPolicy('drug_alcohol', 'Drug and Alcohol Policy'),
                          () => handleDeletePolicy('drug_alcohol', 'Drug and Alcohol Policy'),
                          'Document'
                        )}
                      </View>
                    )}
                  </View>

                  {/* Quality Policy */}
                  <View style={{ marginBottom: 16, paddingHorizontal: 12, paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <CheckBox
                        value={policies.quality.exists}
                        onValueChange={() => setPolicies(prev => ({
                          ...prev,
                          quality: { ...prev.quality, exists: !prev.quality.exists }
                        }))}
                        style={{ marginRight: 12 }}
                        pointerEvents="auto"
                      />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                        Quality Policy
                      </Text>
                    </View>

                    {policies.quality.exists && (
                      <View style={{ paddingLeft: 36 }}>
                        {renderDocumentToggle(
                          'policy-quality',
                          policies.quality,
                          'Quality Policy',
                          () => handleUploadPolicy('quality', 'Quality Policy'),
                          () => handleDeletePolicy('quality', 'Quality Policy'),
                          'Document'
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}

              {/* Sections 5-19 (Dynamic Rendering - hide sections 5-19 when safety accreditations are checked) */}
              {renderSections__719()}
              
              {/* Section 20: Always Show */}
              {renderSection20()}
              
              {/* Section 24: Insurance Documents */}
              {renderInsuranceSection()}
              
              {/* Section 25: Contact Information */}
              {renderContactInfoSection()}
        </View>
      </ScrollView>

      {/* Status Badge and Buttons */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
        {/* Status Badge */}
        <View style={{
          backgroundColor: accreditationStatus === 'completed' ? '#D1FAE5' : '#FEF3C7',
          borderLeftWidth: 4,
          borderLeftColor: accreditationStatus === 'completed' ? '#10B981' : '#FBBF24',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 6,
          marginBottom: 12
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: accreditationStatus === 'completed' ? '#065F46' : '#92400E'
          }}>
            Status: {accreditationStatus === 'completed' ? '✓ Completed' : '⏳ In Progress'}
          </Text>
          {autoSaving && (
            <Text style={{
              fontSize: 12,
              color: '#6B7280',
              marginTop: 4
            }}>
              Auto-saving...
            </Text>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.addButton, { marginBottom: 10 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
            {saving ? 'Saving...' : '✓ Save Accreditation'}
          </Text>
        </TouchableOpacity>

        {/* Submit Button - Only show if not completed */}
        {accreditationStatus !== 'completed' && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#10B981' }]}
            onPress={handleSubmitAsComplete}
            disabled={saving}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
              {saving ? 'Submitting...' : '✓ Submit as Complete'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Completed Badge - Show if submitted */}
        {accreditationStatus === 'completed' && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <View style={{
              backgroundColor: '#D1FAE5',
              borderWidth: 1,
              borderColor: '#10B981',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 6
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#065F46',
                textAlign: 'center'
              }}>
                ✓ This accreditation is complete
              </Text>
            </View>
            {onNavigateToTrainingRecords && (
              <TouchableOpacity
                onPress={onNavigateToTrainingRecords}
                style={{
                  backgroundColor: '#EC4899',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 6,
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: 'white'
                }}>
                  📚 Then add training records →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

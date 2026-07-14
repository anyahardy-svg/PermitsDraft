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
import { getLegalDocument, recordHSAgreementAcceptance } from '../api/legal-documents';
import { getEvidenceLibrary, addToEvidenceLibrary } from '../api/evidence-library';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { getAccreditationSaveStatus } from '../utils/accreditation';

const isAccreditationDebugEnabled = process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_ACCREDITATION_DEBUG === 'true';
const debugLog = (...args) => {
  if (isAccreditationDebugEnabled) {
    console.log(...args);
  }
};
const debugWarn = (...args) => {
  if (isAccreditationDebugEnabled) {
    console.warn(...args);
  }
};

const drawStoredSignatureOnCanvas = (canvas, ctx, signatureData, onSuccess) => {
  if (!canvas || !ctx || !signatureData) return;

  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    onSuccess?.();
  };
  img.onerror = (err) => {
    console.error('Failed to load signature image:', err);
  };
  img.src = signatureData;
};

// Helper function to convert storage paths to full Supabase URLs
const getFullStorageUrl = (storagePath) => {
  if (!storagePath) return null;
  
  // If it's already a full URL, return as-is
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
  
  // Get Supabase URL from environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nszkuoxibzcbiqaqdfml.supabase.co';
  
  // Convert storage path to full URL
  return `${supabaseUrl}/storage/v1/object/public/accreditations/${storagePath}`;
};

const getAccreditationBaseName = (systemKey) =>
  systemKey
    .replace('_accredited', '')
    .replace('_certified', '')
    .replace('_qualified', '')
    .replace('_prequalified', '');

const buildCertificateSaveOverrides = (systemKey, { url, checked } = {}) => {
  const baseName = getAccreditationBaseName(systemKey);
  const overrides = {};

  if (url !== undefined) {
    overrides[`${baseName}_certificate_url`] = url;
  }
  if (checked !== undefined) {
    overrides[systemKey] = checked;
  }

  return overrides;
};

/**
 * CompanyAccreditationScreen
 * Contractor accreditation form with auto-filtered company data
 * 
 * @param {UUID} companyId - Company ID to load (required when logged in)
 * @param {boolean} isAdmin - Whether user is admin (sees all companies) - not used when companyId provided
 * @param {boolean} reviewMode - When true, blocks incidental saves during admin review. Manual Save/Submit and upload/delete actions still persist.
 * @param {Object} styles - App stylesheet
 * @param {function} onClose - Callback to close screen
 * @param {function} onNavigateToTrainingRecords - Callback to navigate to training records after accreditation
 */
export default function CompanyAccreditationScreen({ 
  companyId, 
  isAdmin = false,
  reviewMode = false,
  styles,
  onClose,
  onNavigateToTrainingRecords,
  onStatusUpdate
}) {
  const scrollViewRef = useRef(null);
  const canvasRef = useRef(null);
  const storedSignatureRef = useRef(null);
  const signatureUpdateSourceRef = useRef('load');
  const [scrollOffset, setScrollOffset] = useState(0);

  // If companyId is provided (logged-in contractor), use it directly
  // Otherwise (admin mode), restore from localStorage or start empty
  const [currentCompanyId, setCurrentCompanyId] = useState(() => {
    if (companyId) {
      debugLog('✅ [ACCREDITATION INIT] Set currentCompanyId from prop');
      return companyId;
    }
    if (isAdmin && typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('accreditation_selected_company') || null;
        if (stored) debugLog('✅ [ACCREDITATION INIT] Restored admin currentCompanyId from localStorage');
        return stored;
      } catch (e) {
        debugWarn('localStorage not available');
        return null;
      }
    }
    return null;
  });

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedCompanyData, setHasLoadedCompanyData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPersistingChanges, setIsPersistingChanges] = useState(false);
  const [uploadingDocumentKey, setUploadingDocumentKey] = useState(null); // Track which document is uploading
  const [accreditationStatus, setAccreditationStatus] = useState('in-progress'); // 'in-progress' or 'completed'
  const [confirmationModal, setConfirmationModal] = useState({ visible: false, title: '', message: '', onConfirm: null, onCancel: null });
  
  // Restore expanded sections from localStorage or use defaults
  const [expandedSections, setExpandedSections] = useState(() => {
    const defaults = { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false, 14: false, 15: false, 16: false, 17: false, 18: false, 19: false, 20: false, 21: false, 22: false, 23: false, 24: false, 25: false, 26: false };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('accreditation_expanded_sections');
        const loaded = stored ? JSON.parse(stored) : defaults;
        // Always keep Section 26 closed on load to avoid confusion and long load times
        return { ...loaded, 26: false };
      } catch (e) {
        debugWarn('localStorage not available');
        return defaults;
      }
    }
    return defaults;
  });
  const [expandedEvidenceUI, setExpandedEvidenceUI] = useState(null); // Track which evidence UI is expanded (format: 'section-itemkey')
  const [evidenceLibrary, setEvidenceLibrary] = useState([]); // Company's reusable evidence items
  const [showEvidenceLibraryModal, setShowEvidenceLibraryModal] = useState(false); // Modal for selecting evidence
  const [selectedEvidenceForUpload, setSelectedEvidenceForUpload] = useState(null); // Selected library item to use
  const [lastUploadedFile, setLastUploadedFile] = useState(null); // Track file just uploaded to offer save to library
  const [saveToLibraryModal, setShowSaveToLibraryModal] = useState(false); // Modal to name and save to library
  const [librarySaveName, setLibrarySaveName] = useState('');
  const [hoveredRequiredTooltip, setHoveredRequiredTooltip] = useState(null); // Track which "required" warning is hovered
  const [services, setServices] = useState([]); // Services from database
  const [businessUnits, setBusinessUnits] = useState([]); // Business units from database

  // Section 1 state (Business Units)
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState({});

  // Section 2 state (Services)
  const [approvedServices, setApprovedServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState({});

  // Section 3 state
  const [accreditedSystems, setAccreditedSystems] = useState({});
  const [certificateFiles, setCertificateFiles] = useState({});

  // Section 3 state (Policies)
  const [policies, setPolicies] = useState({
    health_safety: { exists: false, url: null, library_item_id: null },
    environmental: { exists: false, url: null, library_item_id: null },
    drug_alcohol: { exists: false, url: null, library_item_id: null },
    quality: { exists: false, url: null, library_item_id: null }
  });

  // Section 1 state (Business Units) - No state needed, handled separately
  // Section 2 state (Services) - No state needed, handled separately
  // Section 3 state (Policies) - Using policies state above

  // Section 4 state (Accident, Incident & Investigation)
  const [section4, setSection4] = useState({
    accident_reporting: { exists: false, score: 0, evidence: null, library_item_id: null },
    accident_investigation: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 5 state (Health Hazard Management)
  const [section5, setSection5] = useState({
    health_hazard_plan: { exists: false, score: 0, evidence: null, library_item_id: null },
    exposure_monitoring: { exists: false, frequency: 1, score: 0, evidence: null, library_item_id: null },
    respiratory_training: { exists: false, score: 0, evidence: null, library_item_id: null },
    exhaust_ventilation: { exists: false, score: 0, evidence: null, library_item_id: null },
    health_monitoring: { exists: false, frequency: 1, score: 0, evidence: null, library_item_id: null }
  });

  // Section 6 state (Induction & Training)
  const [section6, setSection6] = useState({
    induction_programme: { exists: false, score: 0, evidence: null, library_item_id: null },
    induction_records_process: { exists: false, score: 0, evidence: null, library_item_id: null },
    skills_training_list: { exists: false, score: 0, evidence: null, library_item_id: null },
    competency_testing_system: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 7 state (Hazard Identification & Management)
  const [section7, setSection7] = useState({
    hazard_identification_process: { exists: false, score: 0, evidence: null, library_item_id: null },
    jha_jsea_system: { exists: false, score: 0, evidence: null, library_item_id: null },
    risk_registers: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 8 state (PPE)
  const [section8, setSection8] = useState({
    ppe_compliance_yesno: 'no',
    ppe_training_maintenance: { exists: false, score: 0, evidence: null, library_item_id: null },
    ppe_job_assessment: { exists: false, score: 0, evidence: null, library_item_id: null },
    ppe_maintenance_schedule: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 9 state (Plant & Equipment)
  const [section9, setSection9] = useState({
    plant_equipment_onsite_yesno: 'no',
    plant_equipment_licenses: { exists: false, score: 0, evidence: null, library_item_id: null },
    plant_equipment_safety_provisions: { exists: false, score: 0, evidence: null, library_item_id: null },
    plant_equipment_maintenance: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 10 state (Electrical Equipment)
  const [section10, setSection10] = useState({
    electrical_equipment_onsite_yesno: 'no',
    electrical_equipment_testing: { exists: false, score: 0, evidence: null, library_item_id: null },
    electrical_equipment_licenses: { exists: false, score: 0, evidence: null, library_item_id: null },
    electrical_equipment_safety_provisions: { exists: false, score: 0, evidence: null, library_item_id: null },
    electrical_equipment_maintenance: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 11 state (Emergency Preparedness & Response)
  const [section11, setSection11] = useState({
    emergency_procedures: { exists: false, score: 0, evidence: null, library_item_id: null },
    emergency_first_aid_yesno: 'no',
    emergency_first_aid_equipment: ''
  });

  // Section 12 state (Site Specific Safety Plans)
  const [section12, setSection12] = useState({
    site_safety_plans: { exists: false, score: 0, evidence: null, library_item_id: null },
    site_induction_process: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 13 state (Contractor Management)
  const [section13, setSection13] = useState({
    contractor_induction: { exists: false, score: 0, evidence: null, library_item_id: null },
    contractor_compliance: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 14 state (Health & Wellbeing)
  const [section14, setSection14] = useState({
    health_wellbeing_program: { exists: false, score: 0, evidence: null, library_item_id: null },
    fatigue_management: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

 

  // Section 15 state (Competency & Qualifications)
  const [section15, setSection15] = useState({
    competency_framework: { exists: false, score: 0, evidence: null, library_item_id: null },
    training_records: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 16 state (Communication & Reporting)
  const [section16, setSection16] = useState({
    safety_communication: { exists: false, score: 0, evidence: null, library_item_id: null },
    near_miss_reporting: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 17 state (Performance & Review)
  const [section17, setSection17] = useState({
    performance_monitoring: { exists: false, score: 0, evidence: null, library_item_id: null },
    regular_audits: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 18 state (Injury Management)
  const [section18, setSection18] = useState({
    injury_management: { exists: false, score: 0, evidence: null, library_item_id: null },
    early_intervention: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 19 state (Continuous Improvement)
  const [section19, setSection19] = useState({
    safety_objectives: { exists: false, score: 0, evidence: null, library_item_id: null },
    management_review: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 20 state (Incidents & Breaches)
  const [section20, setSection20] = useState({
    incidents_breaches: { 
      fatalities: '', 
      serious_harm: '', 
      lost_time: '', 
      property_damage: '', 
      pending_prosecutions: 'no',
      pending_prosecutions_comments: '',
      prosecutions_5_years: '',
      environmental_notices: 'no',
      environmental_notices_comments: '',
      exists: false, 
      score: 0, 
      evidence: null,
      library_item_id: null
    }
  });

   // Section 21 state (Quality Management - shown when ISO 9001 is NOT certified)
  const [section21, setSection21] = useState({
    quality_manager_and_plan: 'no', // Yes/No question
    roles_and_responsibilities: { exists: false, score: 0, evidence: null, library_item_id: null },
    purchasing_procedures: { exists: false, score: 0, evidence: null, library_item_id: null },
    subcontractor_evaluation: { exists: false, score: 0, evidence: null, library_item_id: null },
    process_control_plan: { exists: false, score: 0, evidence: null, library_item_id: null },
    nonconformance_procedure: { exists: false, score: 0, evidence: null, library_item_id: null },
    product_rejection: { exists: false, score: 0, evidence: null, library_item_id: null },
    personnel_induction: { exists: false, score: 0, evidence: null, library_item_id: null },
    internal_audits: { exists: false, score: 0, evidence: null, library_item_id: null },
    continuous_improvement: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 22 state (Environmental Management - shown when ISO 14001 is NOT certified)
  const [section22, setSection22] = useState({
    environmental_aspects_assessment: { exists: false, score: 0, evidence: null, library_item_id: null },
    environmental_system_and_plans: { exists: false, score: 0, evidence: null, library_item_id: null },
    waste_management_policy: { exists: false, score: 0, evidence: null, library_item_id: null },
    environmental_improvement_targets: { exists: false, score: 0, evidence: null, library_item_id: null },
    environmental_training_programme: { exists: false, score: 0, evidence: null, library_item_id: null }
  });

  // Section 24 state (Insurance Documents)
  const [section24, setSection24] = useState({
    public_liability_insurance: {
      expiry_date: '',
      url: null,
      uploaded_at: null,
      has_document: false,
      library_item_id: null
    },
    motor_vehicle_insurance: {
      expiry_date: '',
      url: null,
      uploaded_at: null,
      has_document: false,
      library_item_id: null
    },
    professional_indemnity_insurance: {
      expiry_date: '',
      url: null,
      uploaded_at: null,
      has_document: false,
      library_item_id: null
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

  // Section 26 state (H&S Agreement - digital signature)
  const [section26, setSection26] = useState({
    hs_agreement_document: null,
    hs_agreement_signature: null,
    hs_agreement_accepted_by: '',
    hs_agreement_acknowledged: false,
    hs_agreement_loading: false
  });

  const [hasSignature, setHasSignature] = useState(false);
  // Track isDrawing with useRef like HSAgreementModal (not useState)
  const isDrawingRef = useRef(false);

  useEffect(() => {
    storedSignatureRef.current = section26.hs_agreement_signature;
  }, [section26.hs_agreement_signature]);

  // Company information state (for verification/updates)
  const [companyDetails, setCompanyDetails] = useState({
    companyName: '',
    companyEmail: '',
    contactName: '',
    contactSurname: '',
    contactEmail: '',
    contactPhone: '',
    contractorName: '',
    contractorEmail: '',
    nzbn: '',
    address1: '',
    addressCity: '',
    addressPostcode: ''
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

  // Save selected company to localStorage (admin mode only)
  useEffect(() => {
    if (isAdmin && !companyId && currentCompanyId && typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('accreditation_selected_company', currentCompanyId);
      } catch (e) {
        debugWarn('Failed to save to localStorage:', e);
      }
    }
  }, [currentCompanyId, companyId, isAdmin]);

  // Save expanded sections to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('accreditation_expanded_sections', JSON.stringify(expandedSections));
      } catch (e) {
        debugWarn('Failed to save to localStorage:', e);
      }
    }
  }, [expandedSections]);

  // Keep currentCompanyId in sync when parent passes a different companyId
  useEffect(() => {
    if (companyId && companyId !== currentCompanyId) {
      setCurrentCompanyId(companyId);
      setHasLoadedCompanyData(false);
      setCompany(null);
      setCompanyDetails({
        companyName: '',
        companyEmail: '',
        contactName: '',
        contactSurname: '',
        contactEmail: '',
        contactPhone: '',
        contractorName: '',
        contractorEmail: '',
        nzbn: '',
        address1: '',
        addressCity: '',
        addressPostcode: '',
      });
    }
  }, [companyId, currentCompanyId]);

  // Load company data
  useEffect(() => {
    debugLog('🔄 [ACCREDITATION] currentCompanyId changed');
    loadCompanyData();
    if (isAdmin) loadAllCompanies();
  }, [currentCompanyId, isAdmin]);

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

  // Load H&S Agreement document
  useEffect(() => {
    const loadHSAgreement = async () => {
      try {
        const doc = await getLegalDocument('h_s_agreement');
        setSection26(prev => ({
          ...prev,
          hs_agreement_document: doc
        }));
        // Update hasSignature based on whether signature exists
        if (doc?.signature || section26.hs_agreement_signature) {
          setHasSignature(true);
        }
      } catch (error) {
        console.error('Failed to load H&S agreement:', error);
      }
    };
    loadHSAgreement();
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

  // Parse NZ date format (d/m/yyyy or dd/mm/yyyy) to ISO string (yyyy-mm-dd)
  const parseNZDate = (dateString) => {
    if (!dateString) return null;
    const match = String(dateString).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const dateObj = new Date(year, month - 1, day);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month - 1 ||
      dateObj.getDate() !== day
    ) {
      return null;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Convert user-entered or stored dates to ISO for database DATE columns
  const normalizeExpiryDateForStorage = (dateString) => {
    if (!dateString) return null;
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    return parseNZDate(dateString);
  };

  // Format ISO date (yyyy-mm-dd) to NZ display format (dd/mm/yyyy)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    // If already in NZ format, return as-is (allow single-digit day/month while typing)
    if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return dateString;
    }
    
    // If in ISO format (yyyy-mm-dd), convert to NZ
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    return dateString;
  };

  const loadCompanyData = async ({ silent = false } = {}) => {
    // Don't load if no company ID is set
    if (!currentCompanyId) {
      debugLog('⚠️ [ACCREDITATION] No currentCompanyId set, skipping load');
      setHasLoadedCompanyData(false);
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setHasLoadedCompanyData(false);
    }
    try {
      debugLog('🔄 [ACCREDITATION LOAD] Starting load for company');
      // Load accreditation data
      const data = await getCompanyAccreditation(currentCompanyId);
      debugLog('📋 [ACCREDITATION LOAD] Company data loaded:', {
        id: data.id,
        name: data.name,
        email: data.email,
        contact_name: data.contact_name,
        nzbn: data.nzbn,
        address_1: data.address_1,
        address_city: data.address_city,
        near_miss_reporting_exists: data.near_miss_reporting_exists,
        safety_communication_exists: data.safety_communication_exists,
        quality_manager_and_plan_exists: data.quality_manager_and_plan_exists
      });
      setCompany(data);
      
      // Load company details from the company data (which has name, email, contact info)
      // These fields are not accreditation-specific, they're company management fields
      setCompanyDetails(prev => {
        const updated = {
          ...prev,
          companyName: data.name || '',
          companyEmail: data.email || '',
          contactName: data.contact_name || '',
          contactSurname: data.contact_surname || '',
          contactEmail: data.contact_email || '',
          contactPhone: data.contact_phone || '',
          nzbn: data.nzbn || '',
          address1: data.address_1 || '',
          addressCity: data.address_city || '',
          addressPostcode: data.address_postcode || ''
        };
        debugLog('🔍 [DEBUG] Setting companyDetails');
        return updated;
      });
      
      // Populate approved services (now using service IDs from database)
      setApprovedServices(data.approved_services || []);
      const serviceMap = {};
      (data.approved_services || []).forEach(serviceId => {
        serviceMap[serviceId] = true;
      });
      setSelectedServices(serviceMap);

      const buMap = {};
      (data.business_unit_ids || data.fletcher_business_units || []).forEach(unitId => {
        buMap[unitId] = true;
      });
      setSelectedBusinessUnits(buMap);

      // Populate accredited systems
      const systems = {};
      ACCREDITED_SYSTEMS.forEach(sys => {
        const baseName = getAccreditationBaseName(sys.key);
        const certificateUrl = data[`${baseName}_certificate_url`] || null;
        const expiryKeyName = `${baseName}_certificate_expiry`;
        const isoDate = data[expiryKeyName] || null;
        // Convert ISO date (yyyy-mm-dd) to NZ format (dd/mm/yyyy) for display
        const nzDate = formatDateForDisplay(isoDate);
        systems[sys.key] = {
          checked: data[sys.key] || !!certificateUrl,
          expiryDate: nzDate,
          certificateUrl
        };
      });
      setAccreditedSystems(systems);

      if (reviewMode && ACCREDITED_SYSTEMS.some(sys => {
        const baseName = getAccreditationBaseName(sys.key);
        return data[sys.key] || data[`${baseName}_certificate_url`];
      })) {
        setExpandedSections(prev => ({ ...prev, 3: true }));
      }
      
      // Set accreditation status
      const status = data.accreditation_status || 'none';
      setAccreditationStatus(status);
      
      // Notify parent component of the actual status
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }

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
        quality_manager_and_plan: data.quality_manager_and_plan_exists ? 'yes' : 'no',
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
      debugLog('📋 [LOAD] Raw insurance data from DB:', {
        public_liability_expiry: data.public_liability_expiry,
        public_liability_insurance_evidence_url: data.public_liability_insurance_evidence_url,
        motor_vehicle_insurance_expiry: data.motor_vehicle_insurance_expiry,
        motor_vehicle_insurance_evidence_url: data.motor_vehicle_insurance_evidence_url,
        professional_indemnity_insurance_expiry: data.professional_indemnity_insurance_expiry,
        professional_indemnity_insurance_url: data.professional_indemnity_insurance_url,
        professional_indemnity_insurance_uploaded_at: data.professional_indemnity_insurance_uploaded_at
      });
      
      debugLog('🔍 Checking what will be set for section24:', {
        pli_url_truthy: !!data.public_liability_insurance_evidence_url,
        pli_url_value: data.public_liability_insurance_evidence_url,
        mvi_url_truthy: !!data.motor_vehicle_insurance_evidence_url,
        mvi_url_value: data.motor_vehicle_insurance_evidence_url
      });

      const publicLiabilityEvidenceUrl = data.public_liability_insurance_evidence_url || null;
      const motorVehicleEvidenceUrl = data.motor_vehicle_insurance_evidence_url || null;
      
      setSection24({
        public_liability_insurance: {
          expiry_date: formatDateForDisplay(data.public_liability_expiry) || '',
          url: publicLiabilityEvidenceUrl,
          uploaded_at: null,
          has_document: !!publicLiabilityEvidenceUrl
        },
        motor_vehicle_insurance: {
          expiry_date: formatDateForDisplay(data.motor_vehicle_insurance_expiry) || '',
          url: motorVehicleEvidenceUrl,
          uploaded_at: null,
          has_document: !!motorVehicleEvidenceUrl
        },
        professional_indemnity_insurance: {
          expiry_date: formatDateForDisplay(data.professional_indemnity_insurance_expiry) || '',
          url: data.professional_indemnity_insurance_url || null,
          uploaded_at: data.professional_indemnity_insurance_uploaded_at || null,
          has_document: !!data.professional_indemnity_insurance_url
        }
      });

      if (reviewMode && (publicLiabilityEvidenceUrl || motorVehicleEvidenceUrl || data.professional_indemnity_insurance_url)) {
        setExpandedSections(prev => ({ ...prev, 24: true }));
      }

      // Load section 25 (Contact Information)
      debugLog('📋 [LOAD] Contact information from DB:', {
        health_safety_manager_name: data.health_safety_manager_name,
        health_safety_manager_email: data.health_safety_manager_email,
        health_safety_manager_phone: data.health_safety_manager_phone,
        environmental_manager_name: data.environmental_manager_name,
        environmental_manager_email: data.environmental_manager_email,
        environmental_manager_phone: data.environmental_manager_phone,
        quality_manager_name: data.quality_manager_name,
        quality_manager_email: data.quality_manager_email,
        quality_manager_phone: data.quality_manager_phone,
        occupational_hygienist_name: data.occupational_hygienist_name,
        occupational_hygienist_email: data.occupational_hygienist_email,
        occupational_hygienist_phone: data.occupational_hygienist_phone
      });
      
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

      // Load section 20 (Incidents & Breaches)
      setSection20({
        incidents_breaches: {
          fatalities: data.fatalities || '',
          serious_harm: data.serious_harm || '',
          lost_time: data.lost_time || '',
          property_damage: data.property_damage || '',
          pending_prosecutions: data.pending_prosecutions || 'no',
          pending_prosecutions_comments: data.pending_prosecutions_comments || '',
          prosecutions_5_years: data.prosecutions_5_years || '',
          environmental_notices: data.environmental_notices || 'no',
          environmental_notices_comments: data.environmental_notices_comments || '',
          exists: false,
          score: 0,
          evidence: null,
          library_item_id: null
        }
      });

      // Load section 26 (H&S Agreement)
      signatureUpdateSourceRef.current = 'load';
      setSection26(prev => ({
        ...prev,
        hs_agreement_signature: data.hs_agreement_signature || null,
        hs_agreement_accepted_by: data.hs_agreement_accepted_by || '',
        hs_agreement_acknowledged: data.hs_agreement_acknowledged || false
      }));
      setHasSignature(!!data.hs_agreement_signature);
      if (data.hs_agreement_signature) {
        debugLog('🔄 [LOAD] Section 26 signature loaded from DB');
      } else {
        debugLog('🔄 [LOAD] Section 26: No signature in database');
      }
      // Log what was loaded
      if (data.hs_agreement_signature) {
        debugLog('📥 Loaded Section 26 from database:', {
          has_signature: true,
          signature_length: data.hs_agreement_signature.length,
          accepted_by: data.hs_agreement_accepted_by,
          signed_date: data.hs_agreement_signed_date,
          is_accepted: data.hs_agreement_accepted
        });
      }

      // Load evidence library for this company
      const { data: libraryItems, error: libError } = await getEvidenceLibrary(currentCompanyId);
      if (!libError && libraryItems) {
        setEvidenceLibrary(libraryItems);
        debugLog('📚 Loaded evidence library:', libraryItems.length, 'items');
      }

      setHasLoadedCompanyData(true);
    } catch (error) {
      if (!silent) {
        setHasLoadedCompanyData(false);
      }
      Alert.alert('Error', 'Failed to load accreditation data: ' + error.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
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

  const getSelectedBusinessUnitIds = () =>
    Object.keys(selectedBusinessUnits).filter(id => selectedBusinessUnits[id]);

  const getApplicableServices = () => {
    const selectedBUIds = getSelectedBusinessUnitIds();
    if (selectedBUIds.length === 0) return [];
    return services.filter(service => selectedBUIds.includes(service.business_unit_id));
  };

  const getServiceDisplayName = (service) => {
    const applicableServices = getApplicableServices();
    const businessUnit = businessUnits.find(bu => bu.id === service.business_unit_id);
    const hasDuplicateName = applicableServices.filter(s => s.name === service.name).length > 1;
    if (hasDuplicateName && businessUnit) {
      return `${service.name} (${businessUnit.name})`;
    }
    return service.name;
  };

  const handleBusinessUnitToggle = (unitId) => {
    setSelectedBusinessUnits(prev => {
      const updated = {
        ...prev,
        [unitId]: !prev[unitId]
      };
      const selectedBUIds = Object.keys(updated).filter(id => updated[id]);
      const validServiceIds = new Set(
        services
          .filter(service => selectedBUIds.includes(service.business_unit_id))
          .map(service => service.id)
      );
      setSelectedServices(current =>
        Object.fromEntries(
          Object.entries(current).filter(([serviceId, isSelected]) => !isSelected || validServiceIds.has(serviceId))
        )
      );
      return updated;
    });
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

  // Normalize insurance expiry dates to ISO when the user leaves the field
  const handleInsuranceExpiryDateBlur = (insuranceKey) => {
    setSection24(prev => {
      const rawDate = prev[insuranceKey]?.expiry_date || '';
      if (!rawDate || !rawDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        return prev;
      }

      const isoDate = parseNZDate(rawDate);
      if (!isoDate) {
        return prev;
      }

      return {
        ...prev,
        [insuranceKey]: {
          ...prev[insuranceKey],
          expiry_date: isoDate
        }
      };
    });
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
    debugLog('🔴 handleUploadCertificate called!', { systemKey, systemLabel });
    try {
      debugLog('📂 Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });

      debugLog('📂 DocumentPicker result:', result);
      if (result.canceled) {
        debugLog('❌ User canceled');
        return;
      }

      const file = result.assets[0];
      debugLog('📄 Selected file:', file);
      if (!file) {
        debugLog('❌ No file');
        return;
      }

      // Set uploading state
      setUploadingDocumentKey(`certificate-${systemKey}`);

      // Convert the file URI to a blob
      debugLog('🔄 Converting file to blob...');
      const response = await fetch(file.uri);
      const blob = await response.blob();
      debugLog('🔄 Blob created:', { size: blob.size, type: blob.type });
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });
      debugLog('📦 File object created:', { name: fileObject.name, size: fileObject.size });

      // Upload to Supabase Storage
      debugLog('📤 Starting certificate upload...');
      setLoading(true);
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        systemKey,
        fileObject
      );
      debugLog('📤 Upload result:', uploadResult);

      if (uploadResult?.success) {
        // Update state with the new URL
        setAccreditedSystems(prev => ({
          ...prev,
          [systemKey]: {
            ...prev[systemKey],
            checked: true,
            certificateUrl: uploadResult.url,
            library_item_id: null  // Clear library reference since this is a direct upload
          }
        }));
        
        // Persist immediately so admin review and storage stay in sync
        debugLog('💾 Persisting certificate upload immediately...');
        await persistAccreditationChanges(
          buildCertificateSaveOverrides(systemKey, { url: uploadResult.url, checked: true }),
          { force: true }
        );
        
        // Restore scroll position after state update
        setTimeout(() => {
          if (scrollOffset > 0) {
            scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
          }
        }, 100);
        Alert.alert('Success ✅', `${systemLabel} certificate uploaded successfully!`);
      } else {
        debugLog('❌ Upload failed:', uploadResult);
        Alert.alert('Error', 'Failed to upload certificate: ' + (uploadResult?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('🔥 Upload exception:', error);
      console.error('🔥 Error stack:', error.stack);
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      debugLog('🏁 Upload handler completed');
      setUploadingDocumentKey(null);
      setLoading(false);
    }
  };

  // Delete accreditation certificate
  const handleDeleteCertificate = async (systemKey, systemLabel) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the ${systemLabel} certificate? You can upload a new one afterwards.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      const systemData = accreditedSystems[systemKey];
      const certificateUrl = systemData?.certificateUrl;
      const libraryItemId = systemData?.library_item_id;

      if (!certificateUrl) {
        alert('Error: No certificate URL found');
        return;
      }

      // Only delete file from storage if it's NOT a library item
      if (!libraryItemId) {
        const result = await deleteAccreditationCertificate(certificateUrl);
        if (!result.success) {
          alert('Error: Failed to delete certificate: ' + (result.error || 'Unknown error'));
          return;
        }
      }

      // Clear from state
      setAccreditedSystems(prev => ({
        ...prev,
        [systemKey]: {
          ...prev[systemKey],
          certificateUrl: null,
          library_item_id: null
        }
      }));

      // Save to database immediately with explicit overrides
      await persistAccreditationChanges(
        buildCertificateSaveOverrides(systemKey, { url: null }),
        { force: true }
      );

      const deleteType = libraryItemId ? 'removed' : 'deleted';
      alert(`Success: ${systemLabel} certificate ${deleteType}`);
    } catch (error) {
      alert('Error: Failed to delete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle uploading policy document
  const handleUploadPolicy = async (policyKey, policyLabel) => {
    debugLog('🔴 handleUploadPolicy called!', { policyKey, policyLabel });
    try {
      debugLog('📂 Opening document picker for policy...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });

      debugLog('📂 DocumentPicker result:', result);
      if (result.canceled) {
        debugLog('❌ User canceled');
        return;
      }

      const file = result.assets[0];
      debugLog('📄 Selected file:', file);
      if (!file) {
        debugLog('❌ No file');
        return;
      }

      // Set uploading state
      setUploadingDocumentKey(`policy-${policyKey}`);

      // Convert the file URI to a blob
      debugLog('🔄 Converting file to blob...');
      const response = await fetch(file.uri);
      const blob = await response.blob();
      debugLog('🔄 Blob created:', { size: blob.size, type: blob.type });
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });
      debugLog('📦 File object created:', { name: fileObject.name, size: fileObject.size });

      // Upload to Supabase Storage
      debugLog('📤 Starting policy upload...');
      setLoading(true);
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        `policy_${policyKey}`,
        fileObject
      );
      debugLog('📤 Upload result:', uploadResult);

      if (uploadResult.success) {
        // Update state with the new URL
        setPolicies(prev => ({
          ...prev,
          [policyKey]: {
            ...prev[policyKey],
            url: uploadResult.url,
            library_item_id: null  // Clear library reference since this is a direct upload
          }
        }));
        
        // Persist immediately so admin review and storage stay in sync
        debugLog('💾 Persisting policy upload immediately...');
        await persistAccreditationChanges({
          [`${policyKey}_policy_url`]: uploadResult.url,
          [`${policyKey}_policy_exists`]: policies[policyKey]?.exists ?? true,
        }, { force: true });
        
        // Restore scroll position after state update
        setTimeout(() => {
          if (scrollOffset > 0) {
            scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
          }
        }, 100);
        Alert.alert('Success ✅', `${policyLabel} document uploaded successfully!`);
      } else {
        debugLog('❌ Upload failed:', uploadResult);
        Alert.alert('Error', 'Failed to upload: ' + (uploadResult.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('🔥 Upload exception:', error);
      console.error('🔥 Error stack:', error.stack);
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      debugLog('🏁 Upload handler completed');
      setUploadingDocumentKey(null);
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
              const policyData = policies[policyKey];
              const policyUrl = policyData?.url;
              const libraryItemId = policyData?.library_item_id;
              
              if (!policyUrl) {
                Alert.alert('Error', 'No document URL found');
                return;
              }

              // Only delete file from storage if it's NOT a library item
              if (!libraryItemId) {
                const result = await deleteAccreditationCertificate(policyUrl);
                if (!result.success) {
                  Alert.alert('Error', 'Failed to delete: ' + (result.error || 'Unknown error'));
                  return;
                }
              }

              // Clear from state
              setPolicies(prev => ({
                ...prev,
                [policyKey]: {
                  ...prev[policyKey],
                  url: null,
                  library_item_id: null
                }
              }));
              
              // Save to database immediately with explicit overrides
              await persistAccreditationChanges({
                [`${policyKey}_policy_url`]: null,
              }, { force: true });
              
              const deleteType = libraryItemId ? 'removed' : 'deleted';
              Alert.alert('Success', `${policyLabel} document ${deleteType}`);
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

  // Map sections to their state and setters for proper access
  // NOTE: Display section numbers are offset from state variable numbers!
  // Display section N uses state section(N-1)
  // Example: Display Section 6 uses section5 state
  const getSectionData = (displaySectionNum) => {
    // Sections 21-22 map directly to section21/section22 (no offset), matching sectionStateMap
    if (displaySectionNum === 21) {
      return { state: section21, setter: setSection21 };
    }
    if (displaySectionNum === 22) {
      return { state: section22, setter: setSection22 };
    }

    // UI sections 5-20 use offset: display section N → state section(N-1)
    const stateNum = displaySectionNum - 1;
    
    const sectionMap = {
      4: { state: section4, setter: setSection4 },
      5: { state: section5, setter: setSection5 },
      6: { state: section6, setter: setSection6 },
      7: { state: section7, setter: setSection7 },
      8: { state: section8, setter: setSection8 },
      9: { state: section9, setter: setSection9 },
      10: { state: section10, setter: setSection10 },
      11: { state: section11, setter: setSection11 },
      12: { state: section12, setter: setSection12 },
      13: { state: section13, setter: setSection13 },
      14: { state: section14, setter: setSection14 },
      15: { state: section15, setter: setSection15 },
      16: { state: section16, setter: setSection16 },
      17: { state: section17, setter: setSection17 },
      18: { state: section18, setter: setSection18 },
      19: { state: section19, setter: setSection19 },
      20: { state: section20, setter: setSection20 }
    };
    debugLog('🔍 getSectionData: displaySectionNum=', displaySectionNum, 'stateNum=', stateNum);
    return sectionMap[stateNum];
  };

  const handleDeleteEvidence = async (sectionNum, itemKey, itemLabel) => {
    debugLog('🗑️🗑️🗑️ handleDeleteEvidence STARTING 🗑️🗑️🗑️');
    debugLog('Parameters:', { sectionNum, itemKey, itemLabel });
    
    try {
      debugLog('🗑️ Asking for confirmation');
      
      // Use window.confirm for web (Alert.alert doesn't work with buttons on web)
      const confirmed = window.confirm(`Are you sure you want to delete the ${itemLabel} evidence? You can upload new evidence afterwards.`);
      
      if (!confirmed) {
        debugLog('❌ User cancelled delete');
        return;
      }
      
      debugLog('✅ User confirmed delete');
      
      try {
        setLoading(true);
        const sectionData = getSectionData(sectionNum);
        if (!sectionData) {
          console.error('❌ Section not found:', sectionNum);
          alert('Error: Section not found');
          return;
        }
        const sectionState = sectionData.state;
        const itemData = sectionState[itemKey];
        
        debugLog('🔍 Full itemData:', itemData);
        debugLog('🔍 itemData keys:', itemData ? Object.keys(itemData) : 'null');
        
        const evidenceUrl = itemData?.evidence || itemData?.url || itemData?.evidence_url;
        const libraryItemId = itemData?.library_item_id;
        
        debugLog('📋 Evidence data:', { evidenceUrl, libraryItemId, itemData, itemKey, sectionNum });
        
        if (!evidenceUrl) {
          debugLog('⚠️ No evidence URL found - full data:', { itemData, sectionState });
          alert('Error: No evidence URL found');
          return;
        }

        // Only delete file from storage if it's NOT a library item
        if (!libraryItemId) {
          debugLog('🔥 Deleting actual file from storage');
          const result = await deleteAccreditationCertificate(evidenceUrl);
          debugLog('📦 Delete result:', result);
          if (!result.success) {
            alert('Error: Failed to delete evidence: ' + (result.error || 'Unknown error'));
            return;
          }
        } else {
          debugLog('📚 This is a library item - removing association only');
        }

        // Clear from state based on section number
        debugLog('🧹 Clearing evidence for itemKey:', itemKey);
        debugLog('🧹 Current itemData before clear:', sectionState[itemKey]);
        sectionData.setter(prev => {
          const updated = {
            ...prev,
            [itemKey]: { 
              ...prev[itemKey], 
              evidence: null, 
              library_item_id: null,
              // Preserve exists field
              exists: prev[itemKey]?.exists ?? false
            }
          };
          debugLog('🧹 Updated itemData after clear:', updated[itemKey]);
          return updated;
        });
        
        debugLog('💾 Persisting evidence deletion immediately...');
        await persistAccreditationChanges({
          [`${itemKey}_evidence_url`]: null,
        }, { force: true });
        
        const deleteType = libraryItemId ? 'removed' : 'deleted';
        alert(`Success: ${itemLabel} evidence ${deleteType}`);
      } catch (error) {
        console.error('🔥 Delete error:', error);
        alert('Error: Failed to delete: ' + error.message);
      } finally {
        setLoading(false);
      }
    } catch (outerError) {
      console.error('🔥🔥🔥 OUTER ERROR in handleDeleteEvidence:', outerError);
      alert('Error: Failed to process delete: ' + outerError.message);
    }
  };

  const handleUploadInsuranceDocument = async (insuranceType, insuranceLabel) => {
    debugLog('🔴 handleUploadInsuranceDocument called!', { insuranceType, insuranceLabel });
    try {
      debugLog('📂 Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });

      debugLog('📂 DocumentPicker result:', result);
      if (result.canceled) {
        debugLog('❌ User canceled');
        return;
      }

      const file = result.assets[0];
      debugLog('📄 Selected file:', file);
      if (!file) {
        debugLog('❌ No file');
        return;
      }

      // Convert the file URI to a blob
      debugLog('🔄 Converting file to blob...');
      const response = await fetch(file.uri);
      const blob = await response.blob();
      debugLog('🔄 Blob created:', { size: blob.size, type: blob.type });
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });
      debugLog('📦 File object created:', { name: fileObject.name, size: fileObject.size });

      // Set uploading state
      setUploadingDocumentKey(`insurance-${insuranceType}`);

      // Upload to Supabase Storage (accreditations bucket, same as other docs)
      debugLog('📤 Starting insurance upload...');
      setLoading(true);
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        `insurance_${insuranceType}`,
        fileObject
      );
      debugLog('📤 Upload result:', uploadResult);

      if (uploadResult.success) {
        // Update state with the new URL and timestamp
        let insuranceKey;
        if (insuranceType === 'pli') {
          insuranceKey = 'public_liability_insurance';
        } else if (insuranceType === 'mvi') {
          insuranceKey = 'motor_vehicle_insurance';
        } else if (insuranceType === 'pii') {
          insuranceKey = 'professional_indemnity_insurance';
        }
        
        debugLog('🔧 Setting section24 state with:', { insuranceKey, url: uploadResult.url });
        
        setSection24(prev => {
          const updated = {
            ...prev,
            [insuranceKey]: {
              ...prev[insuranceKey],
              url: uploadResult.url,
              uploaded_at: new Date().toISOString(),
              has_document: true,
              library_item_id: null  // Clear library reference since this is a direct upload
            }
          };
          debugLog('🔧 New section24 state:', updated);
          return updated;
        });
        
        const evidenceUrlField = insuranceType === 'pli'
          ? 'public_liability_insurance_evidence_url'
          : insuranceType === 'mvi'
            ? 'motor_vehicle_insurance_evidence_url'
            : 'professional_indemnity_insurance_url';

        // Persist immediately so admin review and storage stay in sync
        debugLog('💾 Persisting insurance document upload immediately...');
        await persistAccreditationChanges({ [evidenceUrlField]: uploadResult.url }, { force: true });
        
        // Restore scroll position after state update
        setTimeout(() => {
          if (scrollOffset > 0) {
            scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
          }
        }, 100);
        Alert.alert('Success ✅', `${insuranceLabel} certificate uploaded successfully!`);
      } else {
        debugLog('❌ Upload failed:', uploadResult);
        Alert.alert('Error', 'Failed to upload: ' + (uploadResult.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('🔥 Upload exception:', error);
      console.error('🔥 Error stack:', error.stack);
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      debugLog('🏁 Upload handler completed');
      setUploadingDocumentKey(null);
      setLoading(false);
    }
  };

  const handleDeleteInsuranceDocument = async (insuranceType, insuranceLabel) => {
    let insuranceKey;
    if (insuranceType === 'pli') {
      insuranceKey = 'public_liability_insurance';
    } else if (insuranceType === 'mvi') {
      insuranceKey = 'motor_vehicle_insurance';
    } else if (insuranceType === 'pii') {
      insuranceKey = 'professional_indemnity_insurance';
    }
    
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
              const insuranceData = section24[insuranceKey];
              const documentUrl = insuranceData?.url;
              const libraryItemId = insuranceData?.library_item_id;
              
              if (!documentUrl) {
                Alert.alert('Error', 'No document URL found');
                return;
              }

              // Only delete file from storage if it's NOT a library item
              if (!libraryItemId) {
                const result = await deleteAccreditationCertificate(documentUrl);
                if (!result.success) {
                  Alert.alert('Error', 'Failed to delete: ' + (result.error || 'Unknown error'));
                  return;
                }
              }

              // Clear from state
              setSection24(prev => ({
                ...prev,
                [insuranceKey]: {
                  ...prev[insuranceKey],
                  url: null,
                  has_document: false,
                  library_item_id: null
                }
              }));
              
              // Explicitly save the deletion to database
              setTimeout(async () => {
                const updateData = {};
                if (insuranceKey === 'public_liability_insurance') {
                  updateData.public_liability_insurance_evidence_url = null;
                } else if (insuranceKey === 'motor_vehicle_insurance') {
                  updateData.motor_vehicle_insurance_evidence_url = null;
                } else if (insuranceKey === 'professional_indemnity_insurance') {
                  updateData.professional_indemnity_insurance_url = null;
                }
                
                debugLog('🗑️ Saving deletion:', updateData);
                const result = await updateCompanyAccreditation(currentCompanyId, updateData);
                if (result.success) {
                  debugLog('✅ Deletion saved to database');
                }
              }, 100);
              
              const deleteType = libraryItemId ? 'removed' : 'deleted';
              Alert.alert('Success', `${insuranceLabel} certificate ${deleteType}`);
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
    debugLog('🔴 handleUploadEvidence called!', { section, itemKey, itemLabel });
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*']
      });
      
      if (result.canceled) {
        debugLog('❌ User canceled document picker');
        return;
      }

      const file = result.assets[0];
      if (!file) {
        debugLog('❌ No file selected');
        return;
      }

      // Set uploading state (but don't show global loading to avoid scroll reset)
      setUploadingDocumentKey(`${section}-${itemKey}`);

      // Convert the file URI to a blob
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const fileObject = new File([blob], file.name, { type: file.mimeType });

      // Upload to Supabase Storage (don't set loading to prevent page scrolling)
      const uploadResult = await uploadAccreditationCertificate(
        currentCompanyId,
        `${section}_${itemKey}_evidence`,
        fileObject
      );

      if (uploadResult.success) {
        debugLog(`✅ Upload successful`);
        
        // Update state with the new URL using the section map
        const sectionUpdater = sectionStateMap[section];
        if (sectionUpdater) {
          sectionUpdater.set(prev => ({
            ...prev,
            [itemKey]: {
              ...prev[itemKey],
              evidence: uploadResult.url,
              library_item_id: null  // Clear library reference since this is a direct upload
            }
          }));
        } else {
          debugWarn(`⚠️ Unknown section: ${section}`);
        }
        
        // Store the uploaded file info to offer saving to library
        setLastUploadedFile({
          storagePath: uploadResult.path,
          fileName: file.name,
          fileSize: blob.size,
          itemLabel: itemLabel
        });
        setShowSaveToLibraryModal(true);
        setLibrarySaveName(file.name);
        
        const currentItem = sectionUpdater?.get()?.[itemKey];
        await persistAccreditationChanges({
          [`${itemKey}_evidence_url`]: uploadResult.url,
          [`${itemKey}_exists`]: currentItem?.exists ?? true,
          [`${itemKey}_score`]: currentItem?.score ?? 0,
        }, { force: true });
        
      } else {
        debugLog('❌ Upload failed:', uploadResult);
        Alert.alert('Error', 'Failed to upload: ' + (uploadResult.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('🔥 Upload exception:', error);
      Alert.alert('Error', 'Failed to upload: ' + error.message);
    } finally {
      setUploadingDocumentKey(null);
    }
  };

  // Map section names to their setState functions (component level for accessibility)
  // Pattern: UI sections 5-22 are offset by 1 from state variables
  // UI Section 5 → section4, UI Section 6 → section5, etc.
  // Sections 24-26 map directly (section24, section25, section26)
  const sectionStateMap = {
    'section5': { get: () => section4, set: setSection4 },   // UI Section 5 → section4
    'section6': { get: () => section5, set: setSection5 },   // UI Section 6 → section5
    'section7': { get: () => section6, set: setSection6 },   // UI Section 7 → section6
    'section8': { get: () => section7, set: setSection7 },   // UI Section 8 → section7
    'section9': { get: () => section8, set: setSection8 },   // UI Section 9 → section8
    'section10': { get: () => section9, set: setSection9 },  // UI Section 10 → section9
    'section11': { get: () => section10, set: setSection10 }, // UI Section 11 → section10
    'section12': { get: () => section11, set: setSection11 }, // UI Section 12 → section11
    'section13': { get: () => section12, set: setSection12 }, // UI Section 13 → section12
    'section14': { get: () => section13, set: setSection13 }, // UI Section 14 → section13
    'section15': { get: () => section14, set: setSection14 }, // UI Section 15 → section14
    'section16': { get: () => section15, set: setSection15 }, // UI Section 16 → section15
    'section17': { get: () => section16, set: setSection16 }, // UI Section 17 → section16
    'section18': { get: () => section17, set: setSection17 }, // UI Section 18 → section17
    'section19': { get: () => section18, set: setSection18 }, // UI Section 19 → section18
    'section20': { get: () => section19, set: setSection19 }, // UI Section 20 → section19
    'section21': { get: () => section21, set: setSection21 }, // UI Section 21 → section21 (DIRECT, no offset!)
    'section22': { get: () => section22, set: setSection22 }, // UI Section 22 → section22 (DIRECT, no offset!)
    'section23': { get: () => section22, set: setSection22 }, // UI Section 23 → section22
    'section24': { get: () => section24, set: setSection24 }, // Direct mapping
    'section25': { get: () => section25, set: setSection25 }, // Direct mapping
    'section26': { get: () => section26, set: setSection26 }  // Direct mapping
  };

  // Helper to apply library item to a question
  const applyLibraryItem = async (documentKey, libraryItem) => {
    try {
      const sectionKey = documentKey.split('-')[0];
      const itemKey = documentKey.substring(sectionKey.length + 1);
      const sectionUpdater = sectionStateMap?.[sectionKey];
      
      if (sectionUpdater) {
        const currentItem = sectionUpdater.get()?.[itemKey];
        sectionUpdater.set(prev => ({
          ...prev,
          [itemKey]: { 
            ...prev[itemKey], 
            evidence: libraryItem.storage_path,
            library_item_id: libraryItem.id  // Track that this came from library
          }
        }));
        await persistAccreditationChanges({
          [`${itemKey}_evidence_url`]: libraryItem.storage_path,
          [`${itemKey}_exists`]: currentItem?.exists ?? true,
          [`${itemKey}_score`]: currentItem?.score ?? 0,
        }, { force: true });
        Alert.alert('Success ✅', `Applied "${libraryItem.item_name}"`);
        setExpandedEvidenceUI(null);
      }
    } catch (e) {
      console.error('❌ Error applying library item:', e);
      Alert.alert('Error', 'Failed to apply library item');
    }
  };

  // Unified helper function to render document toggle button and UI
  const renderDocumentToggle = (documentKey, itemData, itemLabel, handleUploadFn, handleDeleteFn = null, documentType = 'Evidence', showOnlyIcon = false) => {
    const isDocUIExpanded = expandedEvidenceUI === documentKey;
    const hasDocument = itemData?.url || itemData?.evidence || itemData?.certificateUrl;
    const needsDocument = itemData?.score > 1 && !hasDocument;
    const isUploading = uploadingDocumentKey === documentKey;
    const isSection = documentKey.startsWith('section');
    const supportsExpandActions = isSection || documentKey.startsWith('certificate-');

    // Show loading indicator when uploading
    if (isUploading) {
      return (
        <View style={{ paddingTop: 12, paddingBottom: 12, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 18, color: '#3B82F6', fontWeight: '600' }}>⏳ Uploading {itemLabel}...</Text>
        </View>
      );
    }

    // If showOnlyIcon is true, show simple paperclip icon with status
    if (showOnlyIcon) {
      // Show uploaded document
      if (hasDocument && (itemData?.evidence || itemData?.certificateUrl)) {
        return (
          <View>
            <TouchableOpacity
              onPress={() => supportsExpandActions ? setExpandedEvidenceUI(isDocUIExpanded ? null : documentKey) : handleUploadFn()}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 5,
                  backgroundColor: '#D1FAE5',
                  borderWidth: 1,
                  borderColor: '#10B981',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 2
                }}
              >
                <Text style={{ fontSize: 18 }}>📎</Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  backgroundColor: '#F0FDF4',
                  borderRadius: 4,
                  borderLeftWidth: 3,
                  borderLeftColor: '#10B981'
                }}>
                  <Text style={{ fontSize: 18, color: '#166534', fontWeight: '600', marginBottom: 4 }}>✓ {documentType} Uploaded</Text>
                  <TouchableOpacity onPress={() => {
                    const fullUrl = getFullStorageUrl(itemData.certificateUrl || itemData.evidence);
                    if (fullUrl) {
                      Linking.openURL(fullUrl);
                    } else {
                      Alert.alert('Error', 'Cannot open document - URL not available');
                    }
                  }}>
                    <Text style={{ fontSize: 15, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline' }}>📄 View / Download</Text>
                  </TouchableOpacity>
                  {supportsExpandActions && !isSection && (
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                      Click the clip to delete or replace
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Show library dropdown when expanded (section items only) */}
            {isDocUIExpanded && isSection && evidenceLibrary.length > 0 && (
              <View style={{ paddingTop: 12, marginLeft: 38, paddingBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280', marginBottom: 6 }}>📚 Select from library:</Text>
                <View>
                  {evidenceLibrary.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: '#DBEAFE',
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#0284C7',
                        marginBottom: idx < evidenceLibrary.length - 1 ? 6 : 0
                      }}
                      onPress={() => applyLibraryItem(documentKey, item)}
                    >
                      <Text style={{ fontSize: 15, color: '#0284C7', fontWeight: '600' }}>✓ {item.item_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {/* Show action buttons when expanded */}
            {isDocUIExpanded && supportsExpandActions && (
              <View style={{ paddingTop: 8, marginLeft: 38, flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
                {handleDeleteFn && (
                  <TouchableOpacity
                    onPress={() => {
                      debugLog('🗑️ Delete button pressed, calling handler');
                      debugLog('handleDeleteFn is:', typeof handleDeleteFn, handleDeleteFn.toString().substring(0, 100));
                      try {
                        handleDeleteFn();
                      } catch (btnError) {
                        console.error('🔴 ERROR calling handleDeleteFn:', btnError);
                      }
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FEE2E2',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#FECACA'
                    }}
                  >
                    <Text style={{ fontSize: 15, color: '#991B1B', fontWeight: '600' }}>🗑️ Delete</Text>
                  </TouchableOpacity>
                )}
                {handleUploadFn && (
                  <TouchableOpacity
                    onPress={() => handleUploadFn()}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#DBEAFE',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#0284C7'
                    }}
                  >
                    <Text style={{ fontSize: 15, color: '#0284C7', fontWeight: '600' }}>📄 Replace</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      }
      
      // Show needs document warning
      if (needsDocument) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 }}>
            <TouchableOpacity
              onPress={() => handleUploadFn()}
              style={{
                width: 30,
                height: 30,
                borderRadius: 5,
                backgroundColor: '#FEE2E2',
                borderWidth: 1,
                borderColor: '#FCA5A5',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 2,
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              <Text style={{ fontSize: 18 }}>📎</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <View style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: '#FEE2E2',
                borderRadius: 4,
                borderLeftWidth: 3,
                borderLeftColor: '#EF4444'
              }}>
                <Text style={{ fontSize: 18, color: '#991B1B', fontWeight: '600' }}>Evidence Required - Click the clip to upload</Text>
              </View>
            </View>
          </View>
        );
      }

      // Simple icon - click to show library or upload
      // If no library items, just show upload button directly
      if (!isSection || evidenceLibrary.length === 0) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleUploadFn()}
              style={{
                width: 30,
                height: 30,
                borderRadius: 5,
                backgroundColor: '#F3F4F6',
                borderWidth: 1,
                borderColor: '#D1D5DB',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 2,
                cursor: 'pointer'
              }}
            >
              <Text style={{ fontSize: 18 }}>📎</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 15, color: '#6B7280' }}>Click to upload</Text>
          </View>
        );
      }

      // If section with library, show clickable icon to toggle dropdown
      return (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setExpandedEvidenceUI(isDocUIExpanded ? null : documentKey)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 5,
                backgroundColor: '#DBEAFE',
                borderWidth: 1,
                borderColor: '#0284C7',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 2,
                cursor: 'pointer'
              }}
            >
              <Text style={{ fontSize: 18 }}>📎</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 15, color: '#0284C7', fontWeight: '600' }}>Click to {isDocUIExpanded ? 'close' : 'open'}</Text>
          </View>

          {/* Show library dropdown when expanded - no existing document yet */}
          {isDocUIExpanded && isSection && evidenceLibrary.length > 0 && !hasDocument && (
            <View style={{ paddingTop: 8, paddingBottom: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginLeft: 38 }}>📚 From Library:</Text>
              <View style={{ marginLeft: 38 }}>
                {evidenceLibrary.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: '#DBEAFE',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#0284C7',
                      marginBottom: idx < evidenceLibrary.length - 1 ? 6 : 12
                    }}
                    onPress={() => applyLibraryItem(documentKey, item)}
                  >
                    <Text style={{ fontSize: 18, color: '#0284C7', fontWeight: '600' }}>✓ {item.item_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => handleUploadFn()}
                style={{
                  marginLeft: 38,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: '#3B82F6',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#1D4ED8'
                }}
              >
                <Text style={{ fontSize: 18, color: 'white', fontWeight: '600', textAlign: 'center' }}>+ Upload New</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // Otherwise render the full expanded UI (when showOnlyIcon=false)
    return (
      <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', width: '100%' }}>
        {hasDocument ? (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={{ flex: 1, minWidth: 100, backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' }}
              onPress={() => {
                const fullUrl = getFullStorageUrl(itemData.url || itemData.certificateUrl || itemData.evidence);
                if (fullUrl) {
                  Linking.openURL(fullUrl);
                } else {
                  Alert.alert('Error', 'Cannot open document - URL not available');
                }
              }}
            >
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>📄 View</Text>
            </TouchableOpacity>
            {handleDeleteFn && (
              <TouchableOpacity
                style={{ flex: 1, minWidth: 100, backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' }}
                onPress={() => handleDeleteFn()}
              >
                <Text style={{ color: 'white', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>🗑 Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ flex: 1, minWidth: 100, backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' }}
              onPress={() => handleUploadFn()}
            >
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>📄 Replace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Show library dropdown if available (section items only) */}
            {isSection && evidenceLibrary.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280', marginBottom: 6 }}>📚 From Library:</Text>
                <View>
                  {evidenceLibrary.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: '#DBEAFE',
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#0284C7',
                        marginBottom: idx < evidenceLibrary.length - 1 ? 6 : 12
                      }}
                      onPress={() => applyLibraryItem(documentKey, item)}
                    >
                      <Text style={{ fontSize: 18, color: '#0284C7', fontWeight: '600' }}>✓ {item.item_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <TouchableOpacity
              style={{ backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' }}
              onPress={() => handleUploadFn()}
            >
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>📄 Upload</Text>
            </TouchableOpacity>
          </View>
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
      () => handleDeleteEvidence(sectionNum, itemKey, itemLabel),
      'Evidence',
      true // showOnlyIcon = true to show paperclip icon with library dropdown
    );
  };

  // Build update data object
  const buildUpdateData = (status = accreditationStatus) => {
    debugLog('🔧 buildUpdateData called with status:', status);
    const selectedServiceIds = Object.keys(selectedServices).filter(s => selectedServices[s]);
    const selectedBusinessUnitIds = Object.keys(selectedBusinessUnits).filter(u => selectedBusinessUnits[u]);
    
    const updateData = {
      name: companyDetails.companyName?.trim() || null,
      email: companyDetails.companyEmail?.trim() || null,
      nzbn: companyDetails.nzbn?.trim() || null,
      address_1: companyDetails.address1?.trim() || null,
      address_city: companyDetails.addressCity?.trim() || null,
      address_postcode: companyDetails.addressPostcode?.trim() || null,
      contact_name: companyDetails.contactName || null,
      contact_surname: companyDetails.contactSurname || null,
      contact_email: companyDetails.contactEmail || null,
      contact_phone: companyDetails.contactPhone || null,
      approved_services: selectedServiceIds,
      fletcher_business_units: selectedBusinessUnitIds,
      business_unit_ids: selectedBusinessUnitIds,
      accreditation_status: status
    };

    // Add accredited systems
    ACCREDITED_SYSTEMS.forEach(sys => {
      const baseName = getAccreditationBaseName(sys.key);
      const certificateUrl = accreditedSystems[sys.key]?.certificateUrl || null;
      updateData[sys.key] = accreditedSystems[sys.key]?.checked || !!certificateUrl;
      
      // Save certificate URL with correct column name pattern
      const urlKeyName = `${baseName}_certificate_url`;
      updateData[urlKeyName] = accreditedSystems[sys.key]?.certificateUrl || null;
      
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
      } else {
        updateData[expiryKeyName] = null;
      }
    });

    // Add policies (Section 4)
    updateData.health_safety_policy_exists = policies.health_safety.exists;
    updateData.health_safety_policy_url = policies.health_safety.url || null;
    
    updateData.environmental_policy_exists = policies.environmental.exists;
    updateData.environmental_policy_url = policies.environmental.url || null;
    
    updateData.drug_alcohol_policy_exists = policies.drug_alcohol.exists;
    updateData.drug_alcohol_policy_url = policies.drug_alcohol.url || null;
    
    updateData.quality_policy_exists = policies.quality.exists;
    updateData.quality_policy_url = policies.quality.url || null;

    // Add Section 4 data (Accident, Incident & Investigation)
    updateData.accident_reporting_exists = section4.accident_reporting.exists;
    updateData.accident_reporting_score = section4.accident_reporting.score;
    updateData.accident_reporting_evidence_url = section4.accident_reporting.evidence || null;

    updateData.accident_investigation_exists = section4.accident_investigation.exists;
    updateData.accident_investigation_score = section4.accident_investigation.score;
    updateData.accident_investigation_evidence_url = section4.accident_investigation.evidence || null;

    // Add Section 5 data (Health Hazard Management)
    updateData.health_hazard_plan_exists = section5.health_hazard_plan.exists;
    updateData.health_hazard_plan_score = section5.health_hazard_plan.score;
    updateData.health_hazard_plan_evidence_url = section5.health_hazard_plan.evidence || null;

    updateData.exposure_monitoring_exists = section5.exposure_monitoring.exists;
    updateData.exposure_monitoring_frequency = section5.exposure_monitoring.frequency;
    updateData.exposure_monitoring_score = section5.exposure_monitoring.score;
    updateData.exposure_monitoring_evidence_url = section5.exposure_monitoring.evidence || null;

    updateData.respiratory_training_exists = section5.respiratory_training.exists;
    updateData.respiratory_training_score = section5.respiratory_training.score;
    updateData.respiratory_training_evidence_url = section5.respiratory_training.evidence || null;

    updateData.exhaust_ventilation_exists = section5.exhaust_ventilation.exists;
    updateData.exhaust_ventilation_score = section5.exhaust_ventilation.score;
    updateData.exhaust_ventilation_evidence_url = section5.exhaust_ventilation.evidence || null;

    updateData.health_monitoring_exists = section5.health_monitoring.exists;
    updateData.health_monitoring_frequency = section5.health_monitoring.frequency;
    updateData.health_monitoring_score = section5.health_monitoring.score;
    updateData.health_monitoring_evidence_url = section5.health_monitoring.evidence || null;

    // Add Section 6 data (Induction & Training)
    Object.entries(section6).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 7 data (Hazard Identification & Management)
    Object.entries(section7).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 8 data (PPE)
    updateData.ppe_compliance_yesno = section8.ppe_compliance_yesno || 'no';
    Object.entries(section8).forEach(([key, value]) => {
      if (key !== 'ppe_compliance_yesno' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        updateData[`${key}_evidence_url`] = value.evidence || null;
      }
    });

    // Add Section 9 data (Plant & Equipment)
    updateData.plant_equipment_onsite_yesno = section9.plant_equipment_onsite_yesno || 'no';
    Object.entries(section9).forEach(([key, value]) => {
      if (key !== 'plant_equipment_onsite_yesno' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        updateData[`${key}_evidence_url`] = value.evidence || null;
      }
    });

    // Add Section 10 data (Electrical Equipment)
    updateData.electrical_equipment_onsite_yesno = section10.electrical_equipment_onsite_yesno || 'no';
    Object.entries(section10).forEach(([key, value]) => {
      if (key !== 'electrical_equipment_onsite_yesno' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        updateData[`${key}_evidence_url`] = value.evidence || null;
      }
    });

    // Add Section 11 data (Emergency Preparedness & Response)
    updateData.emergency_first_aid_yesno = section11.emergency_first_aid_yesno || 'no';
    updateData.emergency_first_aid_equipment = section11.emergency_first_aid_equipment || '';
    Object.entries(section11).forEach(([key, value]) => {
      if (key !== 'emergency_first_aid_yesno' && key !== 'emergency_first_aid_equipment' && typeof value === 'object' && value !== null) {
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        updateData[`${key}_evidence_url`] = value.evidence || null;
      }
    });

    // Add Section 12 data (Site Specific Safety Plans)
    Object.entries(section12).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 13 data (Contractor Management)
    Object.entries(section13).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 14 data (Health & Wellbeing)
    Object.entries(section14).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 21 data (Quality Management)
    Object.entries(section21).forEach(([key, value]) => {
      if (key === 'quality_manager_and_plan') {
        // First question is yes/no, convert to boolean
        updateData[`${key}_exists`] = value === 'yes';
      } else {
        // Other questions are scored
        updateData[`${key}_exists`] = value.exists;
        updateData[`${key}_score`] = value.score;
        updateData[`${key}_evidence_url`] = value.evidence || null;
      }
    });

    // Add Section 22 data (Environmental Management)
    Object.entries(section22).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 24 data (Insurance Documents)
    updateData.public_liability_expiry = normalizeExpiryDateForStorage(section24.public_liability_insurance.expiry_date);
    updateData.public_liability_insurance_evidence_url = section24.public_liability_insurance.url || null;
    updateData.motor_vehicle_insurance_expiry = normalizeExpiryDateForStorage(section24.motor_vehicle_insurance.expiry_date);
    updateData.motor_vehicle_insurance_evidence_url = section24.motor_vehicle_insurance.url || null;
    updateData.professional_indemnity_insurance_expiry = normalizeExpiryDateForStorage(section24.professional_indemnity_insurance.expiry_date);
    updateData.professional_indemnity_insurance_url = section24.professional_indemnity_insurance.url || null;
    updateData.professional_indemnity_insurance_uploaded_at = section24.professional_indemnity_insurance.uploaded_at || null;

    // Add Section 25 data (Contact Information)
    updateData.health_safety_manager_name = section25.health_safety_manager.name || null;
    updateData.health_safety_manager_email = section25.health_safety_manager.email || null;
    updateData.health_safety_manager_phone = section25.health_safety_manager.phone || null;
    updateData.environmental_manager_name = section25.environmental_manager.name || null;
    updateData.environmental_manager_email = section25.environmental_manager.email || null;
    updateData.environmental_manager_phone = section25.environmental_manager.phone || null;
    updateData.quality_manager_name = section25.quality_manager.name || null;
    updateData.quality_manager_email = section25.quality_manager.email || null;
    updateData.quality_manager_phone = section25.quality_manager.phone || null;
    updateData.occupational_hygienist_name = section25.occupational_hygienist.name || null;
    updateData.occupational_hygienist_email = section25.occupational_hygienist.email || null;
    updateData.occupational_hygienist_phone = section25.occupational_hygienist.phone || null;

    // Add Section 15 data (Competency & Qualifications)
    Object.entries(section15).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 16 data (Communication & Reporting)
    Object.entries(section16).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 17 data (Performance & Review)
    Object.entries(section17).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 18 data (Incident Analysis & Learning)
    Object.entries(section18).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 19 data (Continuous Improvement)
    Object.entries(section19).forEach(([key, value]) => {
      updateData[`${key}_exists`] = value.exists;
      updateData[`${key}_score`] = value.score;
      updateData[`${key}_evidence_url`] = value.evidence || null;
    });

    // Add Section 26 data (Health & Safety Agreement)
    if (section26.hs_agreement_signature) {
      updateData.hs_agreement_signature = section26.hs_agreement_signature;
      debugLog('📝 Section 26: Signature included in update - size:', section26.hs_agreement_signature.length, 'bytes');
    } else {
      debugWarn('⚠️ Section 26: NO SIGNATURE - signature data is missing!');
    }
    if (section26.hs_agreement_accepted_by) {
      updateData.hs_agreement_accepted_by = section26.hs_agreement_accepted_by;
      debugLog('📝 Section 26: Name included -', section26.hs_agreement_accepted_by);
    }
    updateData.hs_agreement_acknowledged = section26.hs_agreement_acknowledged;
    debugLog('📝 Section 26: Acknowledged -', section26.hs_agreement_acknowledged);
    // Record when they signed if they have a signature now
    if (section26.hs_agreement_signature && section26.hs_agreement_accepted_by) {
      updateData.hs_agreement_signed_date = new Date().toISOString();
      updateData.hs_agreement_accepted = true;
      debugLog('✅ Section 26: All required fields present - marking as signed');
    }

    // Add Section 20 data (Incidents & Breaches)
    updateData.fatalities = section20.incidents_breaches?.fatalities || '';
    updateData.serious_harm = section20.incidents_breaches?.serious_harm || '';
    updateData.lost_time = section20.incidents_breaches?.lost_time || '';
    updateData.property_damage = section20.incidents_breaches?.property_damage || '';
    updateData.pending_prosecutions = section20.incidents_breaches?.pending_prosecutions || 'no';
    if (section20.incidents_breaches?.pending_prosecutions_comments) {
      updateData.pending_prosecutions_comments = section20.incidents_breaches.pending_prosecutions_comments;
    }
    updateData.prosecutions_5_years = section20.incidents_breaches?.prosecutions_5_years || '';
    updateData.environmental_notices = section20.incidents_breaches?.environmental_notices || 'no';
    if (section20.incidents_breaches?.environmental_notices_comments) {
      updateData.environmental_notices_comments = section20.incidents_breaches.environmental_notices_comments;
    }

    debugLog('🔧 buildUpdateData returning updateData with insurance fields:', {
      public_liability_insurance_evidence_url: updateData.public_liability_insurance_evidence_url,
      motor_vehicle_insurance_evidence_url: updateData.motor_vehicle_insurance_evidence_url,
      professional_indemnity_insurance_url: updateData.professional_indemnity_insurance_url
    });
    return updateData;
  };

  // Persist accreditation changes — explicit saves only (uploads, deletes, manual Save/Submit).
  // Do NOT add background/timer-based saves. Pass field overrides for upload/delete handlers.
  // Pass { force: true } to save during admin review (uploads, explicit user actions).
  const persistAccreditationChanges = async (overrides = null, options = {}) => {
    const { force = false } = options;
    if (!currentCompanyId || !hasLoadedCompanyData) return;
    if (reviewMode && !force) return;
    
    try {
      setIsPersistingChanges(true);
      const saveStatus = getAccreditationSaveStatus(accreditationStatus);
      const updateData = {
        ...buildUpdateData(saveStatus),
        ...(overrides && typeof overrides === 'object' ? overrides : {}),
      };
      
      // Log section26 data being saved
      if (updateData.hs_agreement_signature || updateData.hs_agreement_accepted_by) {
          debugLog('💾 Saving Section 26:', {
          has_signature: !!updateData.hs_agreement_signature,
          signature_length: updateData.hs_agreement_signature?.length || 0,
          accepted_by: updateData.hs_agreement_accepted_by,
          acknowledged: updateData.hs_agreement_acknowledged,
          signed_date: updateData.hs_agreement_signed_date,
          is_accepted: updateData.hs_agreement_accepted,
          company_id: currentCompanyId
        });
      }
      
      const result = await updateCompanyAccreditation(currentCompanyId, updateData);
      
      if (result.success) {
        debugLog('✨ Accreditation changes persisted', result);
        if (saveStatus !== accreditationStatus) {
          setAccreditationStatus(saveStatus);
          if (onStatusUpdate) {
            onStatusUpdate(saveStatus);
          }
        }
      } else {
        console.error('❌ Persist failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Persist error:', error);
    } finally {
      setIsPersistingChanges(false);
    }
  };

  // Manual save with user feedback
  const handleSave = async () => {
    if (!currentCompanyId) {
      Alert.alert('Error', 'No company selected');
      return;
    }
    if (!hasLoadedCompanyData) {
      Alert.alert('Please wait', 'Accreditation data is still loading. Try saving again once the form has loaded.');
      return;
    }

    debugLog('💾 handleSave called, current status:', accreditationStatus);
    setSaving(true);
    try {
      // Preserve the 'completed' status if already submitted - only save edits without changing status
      const saveStatus = getAccreditationSaveStatus(accreditationStatus);
      const updateData = buildUpdateData(saveStatus);
      debugLog('💾 Update data built with status:', saveStatus);
      const result = await updateCompanyAccreditation(currentCompanyId, updateData);
      
      debugLog('📊 Update result:', result);
      
      
      if (result.success) {
        debugLog('💾 Save successful, reloading data from database...');
        // Silent reload keeps the form mounted so the signature canvas can redraw
        await loadCompanyData({ silent: true });
        Alert.alert('Success ✅', 'Accreditation saved successfully');
      } else {
        Alert.alert('Error', 'Failed to save: ' + result.error);
      }
    } catch (error) {
      console.error('🔥 Save error:', error);
      Alert.alert('Error', 'Save failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Submit accreditation as complete
  const handleSubmitAsComplete = async () => {
    if (!hasLoadedCompanyData) {
      Alert.alert('Please wait', 'Accreditation data is still loading. Try submitting again once the form has loaded.');
      return;
    }

    debugLog('🟢 handleSubmitAsComplete called, current status:', accreditationStatus);
    setConfirmationModal({
      visible: true,
      title: 'Submit Accreditation',
      message: 'Are you sure you want to submit this accreditation as complete? You will be able to edit it later if needed.',
      onConfirm: async () => {
        debugLog('🟢 User confirmed submission');
        setConfirmationModal({ ...confirmationModal, visible: false });
        setSaving(true);
        try {
          const updateData = buildUpdateData('completed');
          debugLog('🟢 Update data built, status will be: completed');
          const result = await updateCompanyAccreditation(currentCompanyId, updateData);
          debugLog('🟢 API result:', result);
          
          if (result.success) {
            debugLog('🟢 Update successful, setting status to completed');
            setAccreditationStatus('completed');
            await loadCompanyData({ silent: true });
          } else {
            console.error('🔥 Failed to submit:', result.error);
          }
        } catch (error) {
          console.error('🔥 Submit error:', error);
        } finally {
          setSaving(false);
        }
      },
      onCancel: () => {
        debugLog('🟡 User cancelled submission');
        setConfirmationModal({ ...confirmationModal, visible: false });
      }
    });
  };

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
          { key: 'ppe_compliance_yesno', question: 'Do you supply your workers with PPE that complies with the AS/NZS Standards?', type: 'yes_no' },
          { key: 'ppe_training_maintenance', question: 'Are staff trained in its correct use, maintenance & storage of their PPE?', type: 'scoring', showIfKey: 'ppe_compliance_yesno' },
          { key: 'ppe_job_assessment', question: 'Has your organisation assessed the jobs & tasks that require PPE?', type: 'scoring', showIfKey: 'ppe_compliance_yesno' },
          { key: 'ppe_maintenance_schedule', question: 'Do you have a maintenance schedule and register of specialised PPE, i.e., gas detectors?', type: 'scoring', showIfKey: 'ppe_compliance_yesno' }
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
          { key: 'plant_equipment_onsite_yesno', question: 'Will you be bringing any plant / equipment onto our sites or use heavy vehicles to transport goods on our behalf?', type: 'yes_no' },
          { key: 'plant_equipment_licenses', question: 'Do you ensure your workers receive training and have the correct licences and/or certificates to operate the plant and equipment they use?', type: 'scoring', showIfKey: 'plant_equipment_onsite_yesno' },
          { key: 'plant_equipment_safety_provisions', question: 'Do you ensure that all plant and equipment are fitted with the correct and legal safety provisions (e.g. rollover protection or seat belts)?', type: 'scoring', showIfKey: 'plant_equipment_onsite_yesno' },
          { key: 'plant_equipment_maintenance', question: 'Is equipment well maintained and are records kept of equipment maintenance, calibration and service?', type: 'scoring', showIfKey: 'plant_equipment_onsite_yesno' }
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
          { key: 'electrical_equipment_onsite_yesno', question: 'Will you be bringing any electrical equipment on site?', type: 'yes_no' },
          { key: 'electrical_equipment_testing', question: 'Does your organisation check and test equipment to ensure it is fit for purpose (e.g. tagging of electrical devices)?', type: 'scoring', showIfKey: 'electrical_equipment_onsite_yesno' },
          { key: 'electrical_equipment_licenses', question: 'Do you ensure your workers receive training and have the correct licences and/or certificates to operate the electrical equipment they use?', type: 'scoring', showIfKey: 'electrical_equipment_onsite_yesno' },
          { key: 'electrical_equipment_safety_provisions', question: 'Do you ensure that all electrical equipment are fitted with the correct and legal safety provisions (e.g. rollover protection or seat belts)?', type: 'scoring', showIfKey: 'electrical_equipment_onsite_yesno' },
          { key: 'electrical_equipment_maintenance', question: 'Is equipment well maintained and are records kept of equipment maintenance, calibration and service?', type: 'scoring', showIfKey: 'electrical_equipment_onsite_yesno' }
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
          { key: 'emergency_first_aid_yesno', question: 'Will your company provide the necessary first aid equipment to deal with emergencies on site?', type: 'yes_no' }
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
          { key: 'quality_manager_and_plan', type: 'yes_no', question: 'Does your organisation have a Quality management plan?' },
          { key: 'roles_and_responsibilities', question: 'Are roles and responsibilities (i.e. who, when, how and review) identified?', showIfKey: 'quality_manager_and_plan' },
          { key: 'purchasing_procedures', question: 'Are procedures for purchasing adequately identified, including: Sources of materials, Procedures for inspection and test of incoming materials, Compliance with suppliers recommendations, Provision of SDS and safety information, Evidence and verification of quality control checks', showIfKey: 'quality_manager_and_plan' },
          { key: 'subcontractor_evaluation', question: 'Are procedures for evaluation of subcontractor\'s ability to meet specification requirements and for monitoring quality of subcontract works defined?', showIfKey: 'quality_manager_and_plan' },
          { key: 'process_control_plan', question: 'Is there a process control plan for your company\'s activities that identifies: The process steps, Factors affecting quality, Methods to monitor process, Acceptability criteria and verification procedure, Activities requiring independent inspection or witness points', showIfKey: 'quality_manager_and_plan' },
          { key: 'nonconformance_procedure', question: 'Is there a procedure for nonconformances and tests in accordance with defined acceptance criteria, including recording and follow-up analysis and improvement?', showIfKey: 'quality_manager_and_plan' },
          { key: 'product_rejection', question: 'Have you ever had product/project rejected that required significant rework or programme impact? (if yes, please explain)', showIfKey: 'quality_manager_and_plan' },
          { key: 'personnel_induction', question: 'Is there a process for ensuring that all personnel have undergone appropriate induction and training to deliver agreed customer requirements?', showIfKey: 'quality_manager_and_plan' },
          { key: 'internal_audits', question: 'Does your organisation undertake regular internal work site, health, safety, environmental and quality inspections and audits?', showIfKey: 'quality_manager_and_plan' },
          { key: 'continuous_improvement', question: 'Do you implement continuous improvement in your quality processes? (if yes, please provide evidence)', showIfKey: 'quality_manager_and_plan' }
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
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
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
                          <Text style={{ color: section.state[item.key] === 'yes' ? 'white' : '#1F2937', fontWeight: '600', fontSize: 15 }}>Yes</Text>
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
                          <Text style={{ color: section.state[item.key] === 'no' ? 'white' : '#1F2937', fontWeight: '600', fontSize: 15 }}>No</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Special cases: Section 11 Q2 - text input for first aid equipment */}
                    {section.number === 12 && item.key === 'emergency_first_aid_yesno' && section.state[item.key] === 'yes' && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>Please specify the first aid equipment you will provide:</Text>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: '#D1D5DB',
                            borderRadius: 6,
                            padding: 10,
                            fontSize: 15,
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
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
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
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 18 }}>{score}</Text>
                          </TouchableOpacity>
                        ))}
                        {renderEvidenceToggle(section.number, item.key, section.state[item.key], item.question)}
                      </View>
                    </View>

                    {/* Frequency selector for exposure_monitoring and health_monitoring */}
                    {item.hasFrequency && section.state[item.key]?.score > 0 && (
                      <View style={{ paddingLeft: 0, marginTop: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Frequency (years):</Text>
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
                              <Text style={{ fontSize: 15, fontWeight: '600', color: section.state[item.key]?.frequency === freq ? 'white' : '#374151' }}>
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
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#1F2937', marginBottom: 12 }}>
                Has your organisation had any of the following accidents/incidents in the past 12 months?
              </Text>
            </View>

            {/* Incident Form - Simplified */}
            <View style={{ gap: 16 }}>
              {/* Fatalities */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Fatalities, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 18, width: 80 }}
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
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Serious Harm Incidents, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 18, width: 80 }}
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
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Lost Time Injuries, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 18, width: 80 }}
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
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Incidents causing significant property damage during a contract, if yes, state how many:</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 18, width: 80 }}
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
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Does your organisation have any pending workplace health, safety and environmental prosecutions or improvement notices, issued by the Work, Health and Safety or Environmental regulators?</Text>
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
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 18, color: '#1F2937' }}>Yes</Text>
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
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 18, color: '#1F2937' }}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Pending Prosecutions Comments (shown only when Yes is selected) */}
              {section20.incidents_breaches?.pending_prosecutions === 'yes' && (
                <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1F2937', marginBottom: 8 }}>Please explain:</Text>
                  <TextInput
                    style={{ 
                      borderWidth: 1, 
                      borderColor: '#D1D5DB', 
                      borderRadius: 4, 
                      paddingHorizontal: 12, 
                      paddingVertical: 10, 
                      fontSize: 16,
                      minHeight: 80,
                      textAlignVertical: 'top'
                    }}
                    placeholder="Provide details about the pending prosecutions or improvement notices..."
                    multiline
                    value={section20.incidents_breaches?.pending_prosecutions_comments || ''}
                    onChangeText={(text) => setSection20(prev => ({
                      ...prev,
                      incidents_breaches: { ...prev.incidents_breaches, pending_prosecutions_comments: text }
                    }))}
                  />
                </View>
              )}

              {/* Past 5 Years Prosecutions */}
              <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>In the past 5 years, how many workplace, health, safety and environmental prosecutions or improvement notices have been issued to the organisation?</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8, fontSize: 18, width: 80 }}
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
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 12 }}>Had any infringement, abatement or enforcement notices served on it by an environmental regulator or authority?</Text>
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
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 18, color: '#1F2937' }}>Yes</Text>
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
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 18, color: '#1F2937' }}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Environmental Notices Comments (shown only when Yes is selected) */}
              {section20.incidents_breaches?.environmental_notices === 'yes' && (
                <View style={{ backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', padding: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1F2937', marginBottom: 8 }}>Please explain:</Text>
                  <TextInput
                    style={{ 
                      borderWidth: 1, 
                      borderColor: '#D1D5DB', 
                      borderRadius: 4, 
                      paddingHorizontal: 12, 
                      paddingVertical: 10, 
                      fontSize: 16,
                      minHeight: 80,
                      textAlignVertical: 'top'
                    }}
                    placeholder="Provide details about the infringement, abatement or enforcement notices..."
                    multiline
                    value={section20.incidents_breaches?.environmental_notices_comments || ''}
                    onChangeText={(text) => setSection20(prev => ({
                      ...prev,
                      incidents_breaches: { ...prev.incidents_breaches, environmental_notices_comments: text }
                    }))}
                  />
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderInsuranceViewLink = (insuranceData) => {
    if (!insuranceData?.has_document || !insuranceData?.url) {
      return null;
    }

    return (
      <TouchableOpacity
        style={{ marginTop: 8, paddingVertical: 6 }}
        onPress={() => {
          const fullUrl = getFullStorageUrl(insuranceData.url);
          if (fullUrl) {
            Linking.openURL(fullUrl);
          } else {
            Alert.alert('Error', 'Cannot open document - URL not available');
          }
        }}
      >
        <Text style={{ fontSize: 15, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline' }}>
          📄 View / Download Certificate
        </Text>
      </TouchableOpacity>
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
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 }}>
                  Public Liability Insurance
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '600', backgroundColor: '#DC2626', color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  COMPULSORY
                </Text>
              </View>

              {/* Expiry Date */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Expiry Date (dd/mm/yyyy)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: section24.public_liability_insurance.expiry_date ? '#10B981' : '#E5E7EB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 18,
                    color: '#1F2937',
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="dd/mm/yyyy (e.g., 25/12/2026)"
                  value={formatDateForDisplay(section24.public_liability_insurance.expiry_date)}
                  onChangeText={(text) => setSection24(prev => ({
                    ...prev,
                    public_liability_insurance: {
                      ...prev.public_liability_insurance,
                      expiry_date: text
                    }
                  }))}
                  onBlur={() => handleInsuranceExpiryDateBlur('public_liability_insurance')}
                  keyboardType="numeric"
                />
              </View>

              {/* Document Upload */}
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
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
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#0284C7', marginBottom: 4 }}>
                    {section24.public_liability_insurance.has_document ? '✓ Document Uploaded' : '+ Upload Certificate'}
                  </Text>
                  <Text style={{ fontSize: 15, color: '#6B7280' }}>
                    PDF or image file
                  </Text>
                </TouchableOpacity>
                {section24.public_liability_insurance.has_document && (
                  <>
                    {renderInsuranceViewLink(section24.public_liability_insurance)}
                    <TouchableOpacity
                      style={{ marginTop: 8, paddingVertical: 6 }}
                      onPress={() => handleDeleteInsuranceDocument('pli', 'Public Liability Insurance')}
                    >
                      <Text style={{ fontSize: 15, color: '#EF4444', fontWeight: '600' }}>
                        🗑️ Remove Document
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Motor Vehicle Insurance (Optional) */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 }}>
                  Motor Vehicle Insurance
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '600', backgroundColor: '#9CA3AF', color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  OPTIONAL
                </Text>
              </View>

              {/* Expiry Date */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Expiry Date (dd/mm/yyyy)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: section24.motor_vehicle_insurance.expiry_date ? '#10B981' : '#E5E7EB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 18,
                    color: '#1F2937',
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="dd/mm/yyyy (optional)"
                  value={formatDateForDisplay(section24.motor_vehicle_insurance.expiry_date)}
                  onChangeText={(text) => setSection24(prev => ({
                    ...prev,
                    motor_vehicle_insurance: {
                      ...prev.motor_vehicle_insurance,
                      expiry_date: text
                    }
                  }))}
                  onBlur={() => handleInsuranceExpiryDateBlur('motor_vehicle_insurance')}
                  keyboardType="numeric"
                />
              </View>

              {/* Document Upload */}
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
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
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#0284C7', marginBottom: 4 }}>
                    {section24.motor_vehicle_insurance.has_document ? '✓ Document Uploaded' : '+ Upload Certificate'}
                  </Text>
                  <Text style={{ fontSize: 15, color: '#6B7280' }}>
                    PDF or image file (optional)
                  </Text>
                </TouchableOpacity>
                {section24.motor_vehicle_insurance.has_document && (
                  <>
                    {renderInsuranceViewLink(section24.motor_vehicle_insurance)}
                    <TouchableOpacity
                      style={{ marginTop: 8, paddingVertical: 6 }}
                      onPress={() => handleDeleteInsuranceDocument('mvi', 'Motor Vehicle Insurance')}
                    >
                      <Text style={{ fontSize: 15, color: '#EF4444', fontWeight: '600' }}>
                        🗑️ Remove Document
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Professional Indemnity Insurance (Optional) */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 }}>
                  Professional Indemnity Insurance
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '600', backgroundColor: '#9CA3AF', color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  OPTIONAL
                </Text>
              </View>

              {/* Expiry Date */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Expiry Date (dd/mm/yyyy)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: section24.professional_indemnity_insurance.expiry_date ? '#10B981' : '#E5E7EB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 18,
                    color: '#1F2937',
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="dd/mm/yyyy (optional)"
                  value={formatDateForDisplay(section24.professional_indemnity_insurance.expiry_date)}
                  onChangeText={(text) => setSection24(prev => ({
                    ...prev,
                    professional_indemnity_insurance: {
                      ...prev.professional_indemnity_insurance,
                      expiry_date: text
                    }
                  }))}
                  onBlur={() => handleInsuranceExpiryDateBlur('professional_indemnity_insurance')}
                  keyboardType="numeric"
                />
              </View>

              {/* Document Upload */}
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Insurance Certificate
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 2,
                    borderColor: section24.professional_indemnity_insurance.has_document ? '#10B981' : '#D1D5DB',
                    borderStyle: 'dashed',
                    borderRadius: 6,
                    padding: 16,
                    alignItems: 'center',
                    backgroundColor: section24.professional_indemnity_insurance.has_document ? '#F0FDF4' : '#F9FAFB'
                  }}
                  onPress={() => handleUploadInsuranceDocument('pii', 'Professional Indemnity Insurance')}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#0284C7', marginBottom: 4 }}>
                    {section24.professional_indemnity_insurance.has_document ? '✓ Document Uploaded' : '+ Upload Certificate'}
                  </Text>
                  <Text style={{ fontSize: 15, color: '#6B7280' }}>
                    PDF or image file (optional)
                  </Text>
                </TouchableOpacity>
                {section24.professional_indemnity_insurance.has_document && (
                  <>
                    {renderInsuranceViewLink(section24.professional_indemnity_insurance)}
                    <TouchableOpacity
                      style={{ marginTop: 8, paddingVertical: 6 }}
                      onPress={() => handleDeleteInsuranceDocument('pii', 'Professional Indemnity Insurance')}
                    >
                      <Text style={{ fontSize: 15, color: '#EF4444', fontWeight: '600' }}>
                        🗑️ Remove Document
                      </Text>
                    </TouchableOpacity>
                  </>
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
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
          {role}
        </Text>

        {/* Name */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Full Name
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: section25[roleKey].name ? '#10B981' : '#E5E7EB',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 18,
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
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Email Address
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: section25[roleKey].email ? '#10B981' : '#E5E7EB',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 18,
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
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Telephone Number
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: section25[roleKey].phone ? '#10B981' : '#E5E7EB',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 18,
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

  // Canvas context tracking for Section 26 signature
  const contextRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Initialize canvas - runs when section is opened/closed or after a loading cycle remounts the canvas
  useEffect(() => {
    if (!expandedSections[26] || loading) {
      debugLog('📋 Section 26 not expanded or form loading, skipping canvas init');
      return;
    }

    debugLog('🖼️ CANVAS INIT - Section opened');

    // Use requestAnimationFrame to wait for DOM to be painted
    let animFrameId;
    let checkAttempts = 0;
    const maxAttempts = 10;

    const initCanvas = () => {
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      
      if (!canvas || !container) {
        checkAttempts++;
        if (checkAttempts < maxAttempts) {
          animFrameId = requestAnimationFrame(initCanvas);
        } else {
          console.error('❌ Canvas or container not found after', maxAttempts, 'attempts');
        }
        return;
      }

      // Get actual rendered container size
      const rect = container.getBoundingClientRect();
      const actualWidth = Math.max(rect.width, 300);
      const actualHeight = 150;

      debugLog('🖼️ Canvas init - size:', { actualWidth, actualHeight });

      // Set canvas resolution (drawing surface)
      canvas.width = actualWidth;
      canvas.height = actualHeight;

      // Set canvas display size
      canvas.style.width = `${actualWidth}px`;
      canvas.style.height = `${actualHeight}px`;

      // Get context and set it up
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, actualWidth, actualHeight);

      contextRef.current = ctx;
      debugLog('✅ Canvas initialized');

      if (storedSignatureRef.current) {
        debugLog('🖼️ Drawing stored signature after canvas init');
        drawStoredSignatureOnCanvas(
          canvas,
          ctx,
          storedSignatureRef.current,
          () => setHasSignature(true)
        );
      }
    };

    // Start the initialization
    animFrameId = requestAnimationFrame(initCanvas);

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [expandedSections[26], loading]);

  // Redraw signature when data is loaded from the database or section 26 is expanded
  useEffect(() => {
    if (!expandedSections[26] || loading) {
      debugLog('🖼️ REDRAW: Section 26 collapsed or form loading, skipping');
      return;
    }

    if (signatureUpdateSourceRef.current === 'draw') {
      signatureUpdateSourceRef.current = 'load';
      debugLog('🖼️ REDRAW: Skipping - signature was just drawn on canvas');
      return;
    }

    if (!section26.hs_agreement_signature) {
      debugLog('🖼️ REDRAW: No signature data, skipping');
      return;
    }

    debugLog('🖼️ REDRAW TRIGGERED - Signature data changed, length:', section26.hs_agreement_signature.length);
    
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    
    if (!canvas || !container) {
      debugWarn('⏳ Canvas or container not ready for redraw - canvas:', !!canvas, 'container:', !!container);
      return;
    }

    debugLog('🖼️ Canvas and container exist, proceeding with redraw');

    const rect = container.getBoundingClientRect();
    const actualWidth = Math.max(rect.width, 300);
    const actualHeight = 150;

    canvas.width = actualWidth;
    canvas.height = actualHeight;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${actualHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Could not get canvas context');
      return;
    }
    
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, actualWidth, actualHeight);
    
    contextRef.current = ctx;
    debugLog('🖼️ Context reinitialized with canvas size:', {w: actualWidth, h: actualHeight});

    let rafId = requestAnimationFrame(() => {
      drawStoredSignatureOnCanvas(
        canvas,
        contextRef.current,
        section26.hs_agreement_signature,
        () => setHasSignature(true)
      );
    });

    return () => {
      debugLog('🖼️ Redraw effect cleanup, cancelling RAF:', rafId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [section26.hs_agreement_signature, expandedSections[26], loading]);

  // Setup canvas event listeners
  useEffect(() => {
    if (!expandedSections[26] || loading) {
      return;
    }

    // Define event handlers first (hoisting)
    const attachEventListeners = (canvas, ctx) => {
      debugLog('✅ Event listeners attached to canvas');

      function handleMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        isDrawingRef.current = true;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }

      function handleMouseMove(e) {
        if (!isDrawingRef.current) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      function handleMouseUp() {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        ctx.closePath();
        const signatureData = canvas.toDataURL('image/png');
        signatureUpdateSourceRef.current = 'draw';
        setSection26(prev => ({ ...prev, hs_agreement_signature: signatureData }));
        setHasSignature(true);
      }

      function handleTouchStart(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        isDrawingRef.current = true;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }

      function handleTouchMove(e) {
        e.preventDefault();
        if (!isDrawingRef.current) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      function handleTouchEnd(e) {
        e.preventDefault();
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        ctx.closePath();
        const signatureData = canvas.toDataURL('image/png');
        signatureUpdateSourceRef.current = 'draw';
        setSection26(prev => ({ ...prev, hs_agreement_signature: signatureData }));
        setHasSignature(true);
      }

      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseleave', handleMouseUp);
      canvas.addEventListener('touchstart', handleTouchStart);
      canvas.addEventListener('touchmove', handleTouchMove);
      canvas.addEventListener('touchend', handleTouchEnd);

      canvasRef.current._handlers = {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
      };
    };

    // Wait longer for canvas initialization to complete (requestAnimationFrame + context setup)
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      
      if (!canvas || !ctx) {
        debugWarn('⏳ Canvas or context not yet ready, retrying in 100ms...');
        // Retry with longer delay
        const retryTimer = setTimeout(() => {
          const canvas2 = canvasRef.current;
          const ctx2 = contextRef.current;
          if (!canvas2 || !ctx2) {
            console.error('❌ Canvas initialization failed after retry');
            return;
          }
          attachEventListeners(canvas2, ctx2);
        }, 100);
        return;
      }
      attachEventListeners(canvas, ctx);
    }, 150);

    return () => {
      clearTimeout(timer);
      const canvas = canvasRef.current;
      if (canvas && canvas._handlers) {
        const h = canvas._handlers;
        canvas.removeEventListener('mousedown', h.handleMouseDown);
        canvas.removeEventListener('mousemove', h.handleMouseMove);
        canvas.removeEventListener('mouseup', h.handleMouseUp);
        canvas.removeEventListener('mouseleave', h.handleMouseUp);
        canvas.removeEventListener('touchstart', h.handleTouchStart);
        canvas.removeEventListener('touchmove', h.handleTouchMove);
        canvas.removeEventListener('touchend', h.handleTouchEnd);
        canvas._handlers = null;
      }
    };
  }, [expandedSections[26], loading]);

  const handleClearSignature = () => {
    if (canvasRef.current && contextRef.current) {
      const ctx = contextRef.current;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      signatureUpdateSourceRef.current = 'draw';
      setSection26(prev => ({
        ...prev,
        hs_agreement_signature: null
      }));
      setHasSignature(false);
    }
  };

  // Section 26: H&S Agreement
  const renderSection26HSAgreement = () => {
    return (
      <View key={26}>
        <TouchableOpacity
          onPress={() => setExpandedSections(prev => ({ ...prev, 26: !prev[26] }))}
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
            Section 26: Health & Safety Agreement
          </Text>
          <Text style={{ fontSize: 18, color: '#0284C7' }}>
            {expandedSections[26] ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSections[26] && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 20, marginBottom: 12, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12 }}>
            {/* Display Agreement Document */}
            {section26.hs_agreement_document && (
              <View style={{ marginBottom: 16, maxHeight: 300, backgroundColor: '#FFFFFF', borderRadius: 6, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <ScrollView>
                  <MarkdownRenderer text={section26.hs_agreement_document.document_content} />
                </ScrollView>
              </View>
            )}

            {/* Name Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>
                Full Name *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: section26.hs_agreement_accepted_by ? '#0284C7' : '#E5E7EB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 18,
                  color: '#1F2937',
                  backgroundColor: '#F9FAFB'
                }}
                placeholder="Enter your full name"
                value={section26.hs_agreement_accepted_by}
                onChangeText={(text) => setSection26(prev => ({
                  ...prev,
                  hs_agreement_accepted_by: text
                }))}
              />
            </View>

            {/* Digital Signature */}
            <View style={{ marginBottom: 16, pointerEvents: 'box-none', width: '100%', height: 160 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>
                Digital Signature * {hasSignature && '✍️'}
              </Text>
              {React.createElement('div', {
                ref: canvasContainerRef,
                style: {
                  borderWidth: '2px',
                  borderColor: '#D1D5DB',
                  borderStyle: 'solid',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                  pointerEvents: 'auto',
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%'
                }
              },
                React.createElement('canvas', {
                  ref: canvasRef,
                  style: {
                    cursor: hasSignature ? 'default' : 'crosshair',
                    display: 'block',
                    touchAction: 'none',
                    pointerEvents: 'auto',
                    width: '100%',
                    height: '100%'
                  }
                })
              )}
              {hasSignature && (
                <TouchableOpacity
                  onPress={handleClearSignature}
                  style={{
                    marginTop: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: '#FEE2E2',
                    borderRadius: 4,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#DC2626' }}>
                    Clear Signature
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Acknowledgement Checkbox */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <CheckBox
                value={section26.hs_agreement_acknowledged}
                onValueChange={(val) => setSection26(prev => ({
                  ...prev,
                  hs_agreement_acknowledged: val
                }))}
                style={{ marginRight: 12 }}
              />
              <Text style={{ fontSize: 15, color: '#374151', flex: 1, paddingTop: 2 }}>
                I acknowledge that I have read and understood the Health & Safety Agreement and undertake to comply with all requirements
              </Text>
            </View>
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>Company & Contact Information</Text>
            
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

            <View style={{ marginBottom: 16 }}>
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
            </View>

            <View style={{ marginBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 12 }}>Company Registration & Address</Text>
              
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>NZBN</Text>
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={companyDetails.nzbn}
                  onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, nzbn: text }))}
                  placeholder="New Zealand Business Number"
                  editable={true}
                  pointerEvents="auto"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Street Address</Text>
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={companyDetails.address1}
                  onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, address1: text }))}
                  placeholder="Street address"
                  editable={true}
                  pointerEvents="auto"
                />
              </View>

              <View style={{ marginBottom: 16, flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    value={companyDetails.addressCity}
                    onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, addressCity: text }))}
                    placeholder="City"
                    editable={true}
                    pointerEvents="auto"
                  />
                </View>
                <View style={{ flex: 0.8 }}>
                  <Text style={styles.label}>Postcode</Text>
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    value={companyDetails.addressPostcode}
                    onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, addressPostcode: text }))}
                    placeholder="Postcode"
                    keyboardType="numeric"
                    editable={true}
                    pointerEvents="auto"
                  />
                </View>
              </View>

              <Text style={{ fontSize: 18, color: '#6B7280' }}>Please verify or update the above information as needed</Text>
            </View>
          </View>

        {/* Section Navigation */}
        {/* Collapsible Sections */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {/* SECTION 1: Business Units */}
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
              Section 1: Business Units
            </Text>
            <Text style={{ fontSize: 18, color: '#0284C7' }}>
              {expandedSections[1] ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections[1] && (
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
                    <Text style={{ flex: 1, fontSize: 18, color: '#1F2937' }}>{unit.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 18, color: '#9CA3AF', fontStyle: 'italic', marginHorizontal: 12 }}>
                  Loading business units...
                </Text>
              )}
            </View>
          )}

          {/* SECTION 2: Services */}
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
              Section 2: Services
            </Text>
            <Text style={{ fontSize: 18, color: '#0284C7' }}>
              {expandedSections[2] ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections[2] && (
            <View style={{ paddingHorizontal: 0, paddingBottom: 20, marginBottom: 12 }}>
              <Text style={[styles.label, { margin: 12, marginBottom: 16 }]}>Which services will you perform on our site?</Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginHorizontal: 12, marginBottom: 12 }}>
                Services are specific to each business unit. Select your business units above first.
              </Text>
              {services.length === 0 ? (
                <Text style={{ fontSize: 18, color: '#9CA3AF', fontStyle: 'italic', marginHorizontal: 12 }}>
                  Loading services...
                </Text>
              ) : getSelectedBusinessUnitIds().length === 0 ? (
                <Text style={{ fontSize: 18, color: '#9CA3AF', fontStyle: 'italic', marginHorizontal: 12 }}>
                  Select business units above to see available services.
                </Text>
              ) : getApplicableServices().length === 0 ? (
                <Text style={{ fontSize: 18, color: '#9CA3AF', fontStyle: 'italic', marginHorizontal: 12 }}>
                  No services found for the selected business units.
                </Text>
              ) : (
                getApplicableServices().map(service => (
                  <View key={service.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} pointerEvents="auto">
                    <CheckBox
                      value={selectedServices[service.id] || false}
                      onValueChange={() => handleServiceToggle(service.id)}
                      style={{ marginRight: 12 }}
                      pointerEvents="auto"
                    />
                    <Text style={{ flex: 1, fontSize: 18, color: '#1F2937' }}>{getServiceDisplayName(service)}</Text>
                  </View>
                ))
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
                    <Text style={{ flex: 1, fontSize: 18, fontWeight: '500', color: '#1F2937' }}>
                      {system.label}
                    </Text>
                  </View>

                  {(accreditedSystems[system.key]?.checked || accreditedSystems[system.key]?.certificateUrl) && (
                    <View style={{ paddingLeft: 36 }}>
                      <Text style={styles.label}>Expiry Date (dd/mm/yyyy):</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="dd/mm/yyyy (e.g., 25/12/2025)"
                        placeholderTextColor="#9CA3AF"
                        value={formatDateForDisplay(accreditedSystems[system.key]?.expiryDate || '')}
                        onChangeText={(text) => handleExpiryDateInput(system.key, text)}
                        onBlur={() => {
                          // Convert and validate when user leaves the field
                          const rawDate = accreditedSystems[system.key]?.expiryDate || '';
                          if (rawDate && rawDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
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
                      
                      {/* Certificate Management - Inline view/replace */}
                      {renderDocumentToggle(
                        `certificate-${system.key}`,
                        accreditedSystems[system.key],
                        system.label,
                        () => handleUploadCertificate(system.key, system.label),
                        () => handleDeleteCertificate(system.key, system.label),
                        'Certificate',
                        true
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
                      <Text style={{ flex: 1, fontSize: 18, fontWeight: '500', color: '#1F2937' }}>
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
                      <Text style={{ flex: 1, fontSize: 18, fontWeight: '500', color: '#1F2937' }}>
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
                      <Text style={{ flex: 1, fontSize: 18, fontWeight: '500', color: '#1F2937' }}>
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
                      <Text style={{ flex: 1, fontSize: 18, fontWeight: '500', color: '#1F2937' }}>
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
              
              {/* Section 26: H&S Agreement - INSIDE ScrollView now */}
              {renderSection26HSAgreement()}
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
            fontSize: 18,
            fontWeight: '600',
            color: accreditationStatus === 'completed' ? '#065F46' : '#92400E'
          }}>
            Status: {accreditationStatus === 'completed' ? '✓ Completed' : '⏳ In Progress'}
          </Text>
          {isPersistingChanges && (
            <Text style={{
              fontSize: 18,
              color: '#6B7280',
              marginTop: 4
            }}>
              Saving...
            </Text>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.addButton, { marginBottom: 10 }]}
          onPress={handleSave}
          disabled={saving || !hasLoadedCompanyData}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 18 }}>
            {saving ? 'Saving...' : '✓ Save Accreditation'}
          </Text>
        </TouchableOpacity>

        {/* Submit Button - Only show if not completed */}
        {accreditationStatus !== 'completed' && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#10B981' }]}
            onPress={handleSubmitAsComplete}
            disabled={saving || !hasLoadedCompanyData}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 18 }}>
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
                fontSize: 18,
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
                  fontSize: 18,
                  fontWeight: '600',
                  color: 'white'
                }}>
                  📚 Then add training records →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Confirmation Modal */}
        <Modal
          visible={confirmationModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmationModal({ ...confirmationModal, visible: false })}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 12,
                color: '#1F2937'
              }}>
                {confirmationModal.title}
              </Text>
              <Text style={{
                fontSize: 18,
                color: '#4B5563',
                marginBottom: 24,
                lineHeight: 20
              }}>
                {confirmationModal.message}
              </Text>
              <View style={{
                flexDirection: 'row',
                gap: 12,
                justifyContent: 'flex-end'
              }}>
                <TouchableOpacity
                  onPress={() => confirmationModal.onCancel && confirmationModal.onCancel()}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    backgroundColor: '#E5E7EB',
                    minWidth: 80,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmationModal.onConfirm && confirmationModal.onConfirm()}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    backgroundColor: '#10B981',
                    minWidth: 80,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    Submit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Save Evidence to Library */}
        <Modal visible={saveToLibraryModal} transparent animationType="fade" onRequestClose={() => setShowSaveToLibraryModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1F2937' }}>💾 Save to Evidence Library?</Text>
              <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 16 }}>
                This evidence can be reused for other questions. Give it a name:
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 18,
                  marginBottom: 16
                }}
                placeholder="Evidence name"
                value={librarySaveName}
                onChangeText={setLibrarySaveName}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, backgroundColor: '#E5E7EB', borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowSaveToLibraryModal(false);
                    setLastUploadedFile(null);
                    Alert.alert('Success ✅', `${lastUploadedFile?.itemLabel} evidence uploaded successfully!`);
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151' }}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, backgroundColor: '#3B82F6', borderRadius: 6, alignItems: 'center' }}
                  onPress={async () => {
                    if (!librarySaveName.trim()) {
                      Alert.alert('Please enter a name for this evidence');
                      return;
                    }
                    if (!lastUploadedFile) {
                      Alert.alert('Error', 'No file information available');
                      return;
                    }

                    try {
                      const result = await addToEvidenceLibrary(
                        currentCompanyId,
                        librarySaveName,
                        lastUploadedFile.storagePath,
                        lastUploadedFile.fileName,
                        lastUploadedFile.fileSize
                      );
                      
                      if (result.error) {
                        Alert.alert('Error', 'Failed to save to library: ' + result.error);
                      } else {
                        // Reload evidence library
                        const { data: libraryItems } = await getEvidenceLibrary(currentCompanyId);
                        if (libraryItems) {
                          setEvidenceLibrary(libraryItems);
                        }
                        Alert.alert('Success ✅', `Added to Evidence Library!\n\n${lastUploadedFile?.itemLabel} uploaded and saved.`);
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to save to library: ' + error.message);
                    } finally {
                      setShowSaveToLibraryModal(false);
                      setLastUploadedFile(null);
                      setLibrarySaveName('');
                    }
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

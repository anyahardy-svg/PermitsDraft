import React, { useState, useEffect } from 'react';
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
import { listContractors } from '../api/contractors';
import { listAllServices } from '../api/services';
import { listBusinessUnits } from '../api/business_units';

/**
 * CompanyAccreditationScreen
 * Allows contractors to view/edit their own accreditation
 * Allows admins to view/edit all contractors' accreditations
 * 
 * @param {UUID} companyId - Current user's company ID (for contractors)
 * @param {boolean} isAdmin - Whether user is admin (sees all companies)
 * @param {Object} styles - App stylesheet
 * @param {function} onClose - Callback to close screen
 */
export default function CompanyAccreditationScreen({ 
  companyId, 
  isAdmin = false, 
  styles,
  onClose 
}) {
  const [currentCompanyId, setCurrentCompanyId] = useState(companyId);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]); // For admin dropdown
  const [contractors, setContractors] = useState([]); // List of all contractors for selection
  const [selectedContractor, setSelectedContractor] = useState(null); // Currently selected contractor
  const [showContractorPicker, setShowContractorPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [accreditationStatus, setAccreditationStatus] = useState('in-progress'); // 'in-progress' or 'completed'
  const [expandedSections, setExpandedSections] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false }); // Track which sections are expanded
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

  // Load contractors on mount
  useEffect(() => {
    const loadAllContractors = async () => {
      try {
        const data = await listContractors();
        setContractors(data || []);
        // Auto-select first contractor if none selected
        if (data && data.length > 0 && !selectedContractor) {
          setSelectedContractor(data[0]);
          setCurrentCompanyId(data[0].company_id);
        }
      } catch (error) {
        console.error('Failed to load contractors:', error);
      }
    };
    loadAllContractors();
  }, []);

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
    if (!currentCompanyId || !selectedContractor) return;
    
    const timer = setTimeout(() => {
      autoSave();
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    return () => clearTimeout(timer);
  }, [companyDetails, selectedServices, selectedBusinessUnits, accreditedSystems, policies, section4, section5, currentCompanyId]);

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
        style={[styles.screenContainer, { flex: 1 }]}
        contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {/* Contractor Selection */}
        <View style={{ marginBottom: 20, paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={styles.label}>Select Contractor:</Text>
          <TouchableOpacity
            style={[styles.input, { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            onPress={() => setShowContractorPicker(true)}
          >
            <Text style={{ color: selectedContractor ? '#1F2937' : '#9CA3AF' }}>
              {selectedContractor?.name || 'Select a contractor...'}
            </Text>
            <Text style={{ fontSize: 16 }}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Contractor Picker Modal */}
        <Modal
          visible={showContractorPicker}
          animationType="slide"
          onRequestClose={() => setShowContractorPicker(false)}
        >
          <View style={[styles.container, { paddingTop: 50 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={[styles.title, { margin: 0 }]}>Select Contractor</Text>
              <TouchableOpacity onPress={() => setShowContractorPicker(false)}>
                <Text style={{ fontSize: 24, color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={contractors}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  onPress={() => {
                    setSelectedContractor(item);
                    // Set contractor details immediately
                    setCompanyDetails(prev => ({
                      ...prev,
                      contractorName: item.name || '',
                      contractorEmail: item.email || ''
                    }));
                    setCurrentCompanyId(item.company_id);
                    // loadCompanyData will be called by the useEffect watching currentCompanyId
                    setShowContractorPicker(false);
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#1F2937' }}>
                    {item.name}
                  </Text>
                  {item.company && (
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {item.company}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>

        {/* Company Information Section */}
        {selectedContractor && (
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
        )}

        {/* Section Navigation */}
        {/* Collapsible Sections */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {/* SECTION 1: Services */}
          <TouchableOpacity
            onPress={() => toggleSection(1)}
            style={{
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
              Section 1: Services
            </Text>
            <Text style={{ fontSize: 18, color: '#6B7280' }}>
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

          {/* SECTION 2: Business Units & Accreditations */}
          <TouchableOpacity
            onPress={() => toggleSection(2)}
            style={{
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
              Section 2: Business Units & Accreditations
            </Text>
            <Text style={{ fontSize: 18, color: '#6B7280' }}>
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

              <Text style={[styles.label, { margin: 12, marginTop: 24, marginBottom: 12 }]}>
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
                      
                      {/* Certificate Management */}
                      {accreditedSystems[system.key]?.certificateUrl && (
                        <View style={{ marginTop: 12, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                          <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 8 }}>
                            ✓ Certificate Uploaded
                          </Text>
                          <TouchableOpacity 
                            onPress={() => {
                              const url = accreditedSystems[system.key]?.certificateUrl;
                              if (url) {
                                Linking.openURL(url).catch(() => 
                                  Alert.alert('Error', 'Could not open certificate')
                                );
                              }
                            }}
                            style={{ marginBottom: 8 }}
                          >
                            <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                              📄 View Certificate
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={{ paddingVertical: 6 }}
                            onPress={() => handleDeleteCertificate(system.key, system.label)}
                          >
                            <Text style={{ fontSize: 12, color: '#EF4444' }}>
                              🗑 Delete Certificate
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: '#3B82F6', marginTop: accreditedSystems[system.key]?.certificateUrl ? 8 : 8 }]}
                        onPress={() => handleUploadCertificate(system.key, system.label)}
                        pointerEvents="auto"
                      >
                        <Text style={{ color: 'white' }}>📄 {accreditedSystems[system.key]?.certificateUrl ? 'Replace' : 'Upload'} Certificate</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* SECTION 3: Policies - Only show if NO accreditation systems selected */}
          {!Object.values(accreditedSystems).some(sys => sys.checked) && (
            <>
              <TouchableOpacity
                onPress={() => toggleSection(3)}
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                  Section 3: Policies
                </Text>
                <Text style={{ fontSize: 18, color: '#6B7280' }}>
                  {expandedSections[3] ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedSections[3] && (
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
                        {policies.health_safety.url && (
                          <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 8 }}>
                              ✓ Document Uploaded
                            </Text>
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(policies.health_safety.url)}
                              style={{ marginBottom: 8 }}
                            >
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Document
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeletePolicy('health_safety', 'Health and Safety Policy')}
                            >
                              <Text style={{ fontSize: 12, color: '#EF4444' }}>
                                🗑 Delete Document
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadPolicy('health_safety', 'Health and Safety Policy')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {policies.health_safety.url ? 'Replace' : 'Upload'} Document</Text>
                        </TouchableOpacity>
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
                        {policies.environmental.url && (
                          <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 8 }}>
                              ✓ Document Uploaded
                            </Text>
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(policies.environmental.url)}
                              style={{ marginBottom: 8 }}
                            >
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Document
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeletePolicy('environmental', 'Environmental Policy')}
                            >
                              <Text style={{ fontSize: 12, color: '#EF4444' }}>
                                🗑 Delete Document
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadPolicy('environmental', 'Environmental Policy')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {policies.environmental.url ? 'Replace' : 'Upload'} Document</Text>
                        </TouchableOpacity>
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
                        {policies.drug_alcohol.url && (
                          <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 8 }}>
                              ✓ Document Uploaded
                            </Text>
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(policies.drug_alcohol.url)}
                              style={{ marginBottom: 8 }}
                            >
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Document
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeletePolicy('drug_alcohol', 'Drug and Alcohol Policy')}
                            >
                              <Text style={{ fontSize: 12, color: '#EF4444' }}>
                                🗑 Delete Document
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadPolicy('drug_alcohol', 'Drug and Alcohol Policy')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {policies.drug_alcohol.url ? 'Replace' : 'Upload'} Document</Text>
                        </TouchableOpacity>
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
                        {policies.quality.url && (
                          <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 8 }}>
                              ✓ Document Uploaded
                            </Text>
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(policies.quality.url)}
                              style={{ marginBottom: 8 }}
                            >
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Document
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeletePolicy('quality', 'Quality Policy')}
                            >
                              <Text style={{ fontSize: 12, color: '#EF4444' }}>
                                🗑 Delete Document
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadPolicy('quality', 'Quality Policy')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {policies.quality.url ? 'Replace' : 'Upload'} Document</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}

          {/* SECTION 4: Accident, Incident & Investigation Management - Only show if no safety accreditations selected */}
          {!Object.values(accreditedSystems).some(sys => sys.checked) && (
            <>
              <TouchableOpacity
                onPress={() => toggleSection(4)}
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                  Section 4: Accident, Incident & Investigation Management
                </Text>
                <Text style={{ fontSize: 18, color: '#6B7280' }}>
                  {expandedSections[4] ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedSections[4] && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 20, marginBottom: 12, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12 }}>
                  <Text style={[styles.label, { marginBottom: 16 }]}>
                    Does your organisation have:
                  </Text>

                  {/* Scoring Criteria */}
                  <View style={{ 
                    backgroundColor: 'white', 
                    borderRadius: 6, 
                    padding: 12, 
                    marginBottom: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: '#F59E0B'
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E', marginBottom: 8 }}>SCORING GUIDE:</Text>
                    {[1, 2, 3, 4].map(score => (
                      <Text key={score} style={{ fontSize: 10, color: '#4B5563', marginBottom: 4, lineHeight: 14 }}>
                        <Text style={{ fontWeight: '600' }}>{score}</Text> - {SCORING_CRITERIA[score]}
                        {score > 1 && <Text style={{ fontWeight: '700', color: '#EF4444' }}> *REQUIRES EVIDENCE</Text>}
                      </Text>
                    ))}
                  </View>

                  {/* Accident Reporting Item - Table Row */}
                  <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        An accident/incident reporting and recording system?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => setSection4(prev => ({
                              ...prev,
                              accident_reporting: { ...prev.accident_reporting, score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FED7AA' : score === 2 ? '#FEF08A' : score === 3 ? '#DCFCE7' : '#DBEAFE',
                              borderWidth: section4.accident_reporting.score === score ? 3 : 1,
                              borderColor: section4.accident_reporting.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section4.accident_reporting.score === score && score > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                backgroundColor: '#EF4444',
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {section4.accident_reporting.score > 0 && (
                      <View style={{ marginTop: 12, paddingLeft: 0 }}>
                        {section4.accident_reporting.score > 1 && !section4.accident_reporting.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                              ⚠️ Evidence Required for Score {section4.accident_reporting.score}
                            </Text>
                          </View>
                        )}
                        {section4.accident_reporting.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 6 }}>
                              ✓ Evidence Uploaded
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL(section4.accident_reporting.evidence)}>
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Evidence
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadEvidence('section4', 'accident_reporting', 'Accident Reporting Evidence')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {section4.accident_reporting.evidence ? 'Replace' : 'Upload'} Evidence{section4.accident_reporting.score > 1 ? ' *' : ''}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Accident Investigation Item - Table Row */}
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        An accident/investigation process?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => setSection4(prev => ({
                              ...prev,
                              accident_investigation: { ...prev.accident_investigation, score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FED7AA' : score === 2 ? '#FEF08A' : score === 3 ? '#DCFCE7' : '#DBEAFE',
                              borderWidth: section4.accident_investigation.score === score ? 3 : 1,
                              borderColor: section4.accident_investigation.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section4.accident_investigation.score === score && score > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                backgroundColor: '#EF4444',
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {section4.accident_investigation.score > 0 && (
                      <View style={{ marginTop: 12, paddingLeft: 0 }}>
                        {section4.accident_investigation.score > 1 && !section4.accident_investigation.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                              ⚠️ Evidence Required for Score {section4.accident_investigation.score}
                            </Text>
                          </View>
                        )}
                        {section4.accident_investigation.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 6 }}>
                              ✓ Evidence Uploaded
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL(section4.accident_investigation.evidence)}>
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Evidence
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadEvidence('section4', 'accident_investigation', 'Investigation Evidence')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {section4.accident_investigation.evidence ? 'Replace' : 'Upload'} Evidence{section4.accident_investigation.score > 1 ? ' *' : ''}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}

          {/* SECTION 5: Health Hazard Management - Only show if no safety accreditations selected */}
          {!Object.values(accreditedSystems).some(sys => sys.checked) && (
            <>
              <TouchableOpacity
                onPress={() => toggleSection(5)}
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                  Section 5: Health Hazard Management
                </Text>
                <Text style={{ fontSize: 18, color: '#6B7280' }}>
                  {expandedSections[5] ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedSections[5] && (
                <View style={{ paddingHorizontal: 12, paddingBottom: 20, marginBottom: 12, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12 }}>
                  <Text style={[styles.label, { marginBottom: 16 }]}>
                    Does your organisation have:
                  </Text>

                  {/* Scoring Criteria */}
                  <View style={{ 
                    backgroundColor: 'white', 
                    borderRadius: 6, 
                    padding: 12, 
                    marginBottom: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: '#F59E0B'
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E', marginBottom: 8 }}>SCORING GUIDE:</Text>
                    {[1, 2, 3, 4].map(score => (
                      <Text key={score} style={{ fontSize: 10, color: '#4B5563', marginBottom: 4, lineHeight: 14 }}>
                        <Text style={{ fontWeight: '600' }}>{score}</Text> - {SCORING_CRITERIA[score]}
                        {score > 1 && <Text style={{ fontWeight: '700', color: '#EF4444' }}> *REQUIRES EVIDENCE</Text>}
                      </Text>
                    ))}
                  </View>

                  {/* Health Hazard Plan - Table Row */}
                  <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        A Health Hazard Management Plan?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => setSection5(prev => ({
                              ...prev,
                              health_hazard_plan: { ...prev.health_hazard_plan, score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FED7AA' : score === 2 ? '#FEF08A' : score === 3 ? '#DCFCE7' : '#DBEAFE',
                              borderWidth: section5.health_hazard_plan.score === score ? 3 : 1,
                              borderColor: section5.health_hazard_plan.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section5.health_hazard_plan.score === score && score > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                backgroundColor: '#EF4444',
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {section5.health_hazard_plan.score > 0 && (
                      <View style={{ marginTop: 12 }}>
                        {section5.health_hazard_plan.score > 1 && !section5.health_hazard_plan.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                              ⚠️ Evidence Required for Score {section5.health_hazard_plan.score}
                            </Text>
                          </View>
                        )}
                        {section5.health_hazard_plan.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 6 }}>
                              ✓ Evidence Uploaded
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL(section5.health_hazard_plan.evidence)}>
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Evidence
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadEvidence('section5', 'health_hazard_plan', 'Health Hazard Plan Evidence')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {section5.health_hazard_plan.evidence ? 'Replace' : 'Upload'} Evidence{section5.health_hazard_plan.score > 1 ? ' *' : ''}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Exposure Monitoring - Table Row */}
                  <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        A plan to conduct exposure monitoring?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => setSection5(prev => ({
                              ...prev,
                              exposure_monitoring: { ...prev.exposure_monitoring, score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FED7AA' : score === 2 ? '#FEF08A' : score === 3 ? '#DCFCE7' : '#DBEAFE',
                              borderWidth: section5.exposure_monitoring.score === score ? 3 : 1,
                              borderColor: section5.exposure_monitoring.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section5.exposure_monitoring.score === score && score > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                backgroundColor: '#EF4444',
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {section5.exposure_monitoring.score > 0 && (
                      <View style={{ paddingLeft: 0 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 }}>Frequency (years):</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                          {[1, 2, 3, 4, 5].map(freq => (
                            <TouchableOpacity
                              key={freq}
                              onPress={() => setSection5(prev => ({
                                ...prev,
                                exposure_monitoring: { ...prev.exposure_monitoring, frequency: freq }
                              }))}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 4,
                                backgroundColor: section5.exposure_monitoring.frequency === freq ? '#3B82F6' : '#E5E7EB',
                                marginRight: 6
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '600', color: section5.exposure_monitoring.frequency === freq ? 'white' : '#374151' }}>
                                {freq}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {section5.exposure_monitoring.score > 1 && !section5.exposure_monitoring.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                              ⚠️ Evidence Required for Score {section5.exposure_monitoring.score}
                            </Text>
                          </View>
                        )}
                        {section5.exposure_monitoring.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 6 }}>
                              ✓ Evidence Uploaded
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL(section5.exposure_monitoring.evidence)}>
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Evidence
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadEvidence('section5', 'exposure_monitoring', 'Exposure Monitoring Evidence')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {section5.exposure_monitoring.evidence ? 'Replace' : 'Upload'} Evidence{section5.exposure_monitoring.score > 1 ? ' *' : ''}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Respiratory Training - Table Row */}
                  <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        A programme of training and fit testing for respiratory protection?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => setSection5(prev => ({
                              ...prev,
                              respiratory_training: { ...prev.respiratory_training, score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FED7AA' : score === 2 ? '#FEF08A' : score === 3 ? '#DCFCE7' : '#DBEAFE',
                              borderWidth: section5.respiratory_training.score === score ? 3 : 1,
                              borderColor: section5.respiratory_training.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section5.respiratory_training.score === score && score > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                backgroundColor: '#EF4444',
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {section5.respiratory_training.score > 0 && (
                      <View style={{ marginTop: 12 }}>
                        {section5.respiratory_training.score > 1 && !section5.respiratory_training.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                              ⚠️ Evidence Required for Score {section5.respiratory_training.score}
                            </Text>
                          </View>
                        )}
                        {section5.respiratory_training.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 6 }}>
                              ✓ Evidence Uploaded
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL(section5.respiratory_training.evidence)}>
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Evidence
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadEvidence('section5', 'respiratory_training', 'Respiratory Training Evidence')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {section5.respiratory_training.evidence ? 'Replace' : 'Upload'} Evidence{section5.respiratory_training.score > 1 ? ' *' : ''}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Exhaust Ventilation - Table Row */}
                  <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        A routine maintenance programme for ventilation systems?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => setSection5(prev => ({
                              ...prev,
                              exhaust_ventilation: { ...prev.exhaust_ventilation, score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FED7AA' : score === 2 ? '#FEF08A' : score === 3 ? '#DCFCE7' : '#DBEAFE',
                              borderWidth: section5.exhaust_ventilation.score === score ? 3 : 1,
                              borderColor: section5.exhaust_ventilation.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section5.exhaust_ventilation.score === score && score > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                backgroundColor: '#EF4444',
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {section5.exhaust_ventilation.score > 0 && (
                      <View style={{ marginTop: 12 }}>
                        {section5.exhaust_ventilation.score > 1 && !section5.exhaust_ventilation.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                              ⚠️ Evidence Required for Score {section5.exhaust_ventilation.score}
                            </Text>
                          </View>
                        )}
                        {section5.exhaust_ventilation.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 6 }}>
                              ✓ Evidence Uploaded
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL(section5.exhaust_ventilation.evidence)}>
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Evidence
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadEvidence('section5', 'exhaust_ventilation', 'Ventilation Evidence')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {section5.exhaust_ventilation.evidence ? 'Replace' : 'Upload'} Evidence{section5.exhaust_ventilation.score > 1 ? ' *' : ''}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Health Monitoring - Table Row */}
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#1F2937', marginRight: 12 }}>
                        Health monitoring for all exposed workers?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3, 4].map(score => (
                          <TouchableOpacity
                            key={score}
                            onPress={() => setSection5(prev => ({
                              ...prev,
                              health_monitoring: { ...prev.health_monitoring, score, exists: true }
                            }))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              backgroundColor: score === 1 ? '#FED7AA' : score === 2 ? '#FEF08A' : score === 3 ? '#DCFCE7' : '#DBEAFE',
                              borderWidth: section5.health_monitoring.score === score ? 3 : 1,
                              borderColor: section5.health_monitoring.score === score ? '#1F2937' : '#D1D5DB',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 16 }}>{score}</Text>
                            {section5.health_monitoring.score === score && score > 1 && (
                              <View style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                backgroundColor: '#EF4444',
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: 'white' }}>!</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {section5.health_monitoring.score > 0 && (
                      <View style={{ paddingLeft: 0 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 }}>Frequency (years):</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                          {[1, 2, 3, 4, 5].map(freq => (
                            <TouchableOpacity
                              key={freq}
                              onPress={() => setSection5(prev => ({
                                ...prev,
                                health_monitoring: { ...prev.health_monitoring, frequency: freq }
                              }))}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 4,
                                backgroundColor: section5.health_monitoring.frequency === freq ? '#3B82F6' : '#E5E7EB',
                                marginRight: 6
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '600', color: section5.health_monitoring.frequency === freq ? 'white' : '#374151' }}>
                                {freq}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {section5.health_monitoring.score > 1 && !section5.health_monitoring.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                              ⚠️ Evidence Required for Score {section5.health_monitoring.score}
                            </Text>
                          </View>
                        )}
                        {section5.health_monitoring.evidence && (
                          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 6 }}>
                              ✓ Evidence Uploaded
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openURL(section5.health_monitoring.evidence)}>
                              <Text style={{ fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' }}>
                                📄 View Evidence
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleUploadEvidence('section5', 'health_monitoring', 'Health Monitoring Evidence')}
                          pointerEvents="auto"
                        >
                          <Text style={{ color: 'white' }}>📄 {section5.health_monitoring.evidence ? 'Replace' : 'Upload'} Evidence{section5.health_monitoring.score > 1 ? ' *' : ''}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}
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
          <View style={{
            backgroundColor: '#D1FAE5',
            borderWidth: 1,
            borderColor: '#10B981',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginTop: 8
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
        )}
      </View>
    </View>
  );
}

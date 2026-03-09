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
} from 'react-native';
import { getCompanyAccreditation, updateCompanyAccreditation, getExpiryStatus, uploadAccreditationCertificate } from '../api/accreditations';
import { listCompanies } from '../api/companies';
import { listContractors } from '../api/contractors';

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
  const [expandedSections, setExpandedSections] = useState({ 2: true, 3: false }); // Track which sections are expanded

  // Section 2 state
  const [approvedServices, setApprovedServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState({});
  const [fletherBusinessUnits, setFletherBusinessUnits] = useState({});

  // Section 3 state
  const [accreditedSystems, setAccreditedSystems] = useState({});
  const [certificateFiles, setCertificateFiles] = useState({});

  const SERVICES_LIST = [
    'Air Compressors',
    'Air Conditioners',
    'Blasting',
    'Chemicals',
    'Cleaning',
    'Confined Space Entry',
    'Conveyor Servicing',
    'Crane Certification',
    'Drilling',
    'Electrical Tagging',
    'Electrical work',
    'Gardening',
    'General Maintenance Works',
    'Hot work',
    'Hygiene Monitoring',
    'Labour hire',
    'Mobile Plant Servicing',
    'Onsite Refuelling',
    'Operation of Mobile Cranes and/or slinging / lifting activities',
    'Pest Control',
    'Road Transport',
    'Scaffolding',
    'Use of Mobile Plant (e.g. Forklifts, Elevated Work Platforms)',
    'Working at Heights'
  ];

  const FLETCHER_UNITS = [
    'Firth',
    'Fletcher Steel',
    'Golden Bay',
    'Humes',
    'Stramit',
    'Winstone Aggregates'
  ];

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

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const data = await getCompanyAccreditation(currentCompanyId);
      setCompany(data);
      
      // Populate form fields
      setApprovedServices(data.approved_services || []);
      const serviceMap = {};
      SERVICES_LIST.forEach(service => {
        serviceMap[service] = (data.approved_services || []).includes(service);
      });
      setSelectedServices(serviceMap);

      const buMap = {};
      FLETCHER_UNITS.forEach(unit => {
        buMap[unit] = (data.fletcher_business_units || []).includes(unit);
      });
      setFletherBusinessUnits(buMap);

      // Populate accredited systems
      const systems = {};
      ACCREDITED_SYSTEMS.forEach(sys => {
        systems[sys.key] = {
          checked: data[sys.key] || false,
          expiryDate: data[`${sys.key.replace('_accredited', '_certificate_expiry').replace('_certified', '_certificate_expiry').replace('_qualified', '_certificate_expiry').replace('_prequalified', '_certificate_expiry')}`] || null,
          fileUrl: data[`${sys.key.replace('_accredited', '_certificate_url').replace('_certified', '_certificate_url').replace('_qualified', '_certificate_url').replace('_prequalified', '_certificate_url')}`] || null
        };
      });
      setAccreditedSystems(systems);
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

  const handleFletcherUnitToggle = (unit) => {
    setFletherBusinessUnits(prev => ({
      ...prev,
      [unit]: !prev[unit]
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

  const handleExpiryDateChange = (key, date) => {
    setAccreditedSystems(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        expiryDate: date
      }
    }));
  };

  const toggleSection = (sectionNum) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionNum]: !prev[sectionNum]
    }));
  };

  const handleSave = async () => {
    if (!currentCompanyId) {
      Alert.alert('Error', 'No company selected');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        approved_services: Object.keys(selectedServices).filter(s => selectedServices[s]),
        fletcher_business_units: Object.keys(fletherBusinessUnits).filter(u => fletherBusinessUnits[u])
      };

      // Add accredited systems
      ACCREDITED_SYSTEMS.forEach(sys => {
        updateData[sys.key] = accreditedSystems[sys.key].checked;
        const expiryKey = `${sys.key.replace('_accredited', '_certificate_expiry').replace('_certified', '_certificate_expiry').replace('_qualified', '_certificate_expiry').replace('_prequalified', '_certificate_expiry')}`;
        if (accreditedSystems[sys.key].expiryDate) {
          updateData[expiryKey] = accreditedSystems[sys.key].expiryDate;
        }
      });

      const result = await updateCompanyAccreditation(currentCompanyId, updateData);
      
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.screenContainer}>
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
                    setCurrentCompanyId(item.company_id);
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

        {/* Section Navigation */}
        {/* Collapsible Sections */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {/* SECTION 2: Services & Business Units */}
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
              Section 2: Services & Business Units
            </Text>
            <Text style={{ fontSize: 18, color: '#6B7280' }}>
              {expandedSections[2] ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections[2] && (
            <View style={{ paddingHorizontal: 0, paddingBottom: 20, marginBottom: 12 }}>
              <Text style={[styles.label, { margin: 12, marginBottom: 16 }]}>Which services will you perform on our site?</Text>
              {SERVICES_LIST.map(service => (
                <View key={service} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <CheckBox
                    value={selectedServices[service] || false}
                    onValueChange={() => handleServiceToggle(service)}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ flex: 1, fontSize: 14, color: '#1F2937' }}>{service}</Text>
                </View>
              ))}

              <Text style={[styles.label, { margin: 12, marginTop: 24, marginBottom: 12 }]}>
                Which Fletcher business units do you work for?
              </Text>
              {FLETCHER_UNITS.map(unit => (
                <View key={unit} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <CheckBox
                    value={fletherBusinessUnits[unit] || false}
                    onValueChange={() => handleFletcherUnitToggle(unit)}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ flex: 1, fontSize: 14, color: '#1F2937' }}>{unit}</Text>
                </View>
              ))}
            </View>
          )}

          {/* SECTION 3: Accredited Systems */}
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
              Section 3: Accredited Systems
            </Text>
            <Text style={{ fontSize: 18, color: '#6B7280' }}>
              {expandedSections[3] ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedSections[3] && (
            <View style={{ paddingHorizontal: 0, paddingBottom: 20, marginBottom: 12 }}>
              {ACCREDITED_SYSTEMS.map(system => (
                <View key={system.key} style={{ marginBottom: 20, paddingHorizontal: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <CheckBox
                      value={accreditedSystems[system.key]?.checked || false}
                      onValueChange={() => handleAccreditationToggle(system.key)}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                      {system.label}
                    </Text>
                  </View>

                  {accreditedSystems[system.key]?.checked && (
                    <View style={{ paddingLeft: 36 }}>
                      <Text style={styles.label}>Expiry Date:</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={accreditedSystems[system.key]?.expiryDate || ''}
                        onChangeText={(text) => handleExpiryDateChange(system.key, text)}
                      />
                      
                      {accreditedSystems[system.key]?.fileUrl && (
                        <Text style={{ fontSize: 12, color: '#10B981', marginTop: 8 }}>
                          ✓ Certificate uploaded
                        </Text>
                      )}

                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: '#9CA3AF', marginTop: 8 }]}
                        onPress={() => Alert.alert('File Upload', 'Upload certificate functionality coming soon')}
                      >
                        <Text style={{ color: 'white' }}>📄 Upload Certificate</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.addButton, { marginHorizontal: 16, marginBottom: 16 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
          {saving ? 'Saving...' : '✓ Save Accreditation'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

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
  const [expandedSections, setExpandedSections] = useState({ 1: true, 2: false }); // Track which sections are expanded
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
        const expiryKeyName = `${sys.key.replace('_accredited', '_certificate_expiry').replace('_certified', '_certificate_expiry').replace('_qualified', '_certificate_expiry').replace('_prequalified', '_certificate_expiry')}`;
        const isoDate = data[expiryKeyName] || null;
        // Convert ISO date to NZ format (dd/mm/yyyy)
        let nzDate = null;
        if (isoDate) {
          try {
            const d = new Date(isoDate);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            nzDate = `${day}/${month}/${year}`;
          } catch (e) {
            nzDate = isoDate;
          }
        }
        systems[sys.key] = {
          checked: data[sys.key] || false,
          expiryDate: nzDate,
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

  const handleSave = async () => {
    if (!currentCompanyId) {
      Alert.alert('Error', 'No company selected');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        approved_services: Object.keys(selectedServices).filter(s => selectedServices[s]),
        fletcher_business_units: Object.keys(selectedBusinessUnits).filter(u => selectedBusinessUnits[u])
      };

      // Add accredited systems
      ACCREDITED_SYSTEMS.forEach(sys => {
        updateData[sys.key] = accreditedSystems[sys.key]?.checked || false;
        const expiryKeyName = `${sys.key.replace('_accredited', '_certificate_expiry').replace('_certified', '_certificate_expiry').replace('_qualified', '_certificate_expiry').replace('_prequalified', '_certificate_expiry')}`;
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
                      
                      {accreditedSystems[system.key]?.fileUrl && (
                        <Text style={{ fontSize: 12, color: '#10B981', marginTop: 8 }}>
                          ✓ Certificate uploaded
                        </Text>
                      )}

                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: '#9CA3AF', marginTop: 8 }]}
                        onPress={() => Alert.alert('File Upload', 'Upload certificate functionality coming soon')}
                        pointerEvents="auto"
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

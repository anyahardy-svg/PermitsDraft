import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { saveJseaTemplate, getJseaTemplates, deleteJseaTemplate, updateJseaTemplate } from '../api/templates';
import { savePermitAsTemplate, getTemplates as getPermitTemplates, deleteTemplate as deletePermitTemplate } from '../api/permits';
import { listCompanies } from '../api/companies';
import { getSitesByBusinessUnits } from '../api/sites';
import JseaEditorScreen from './JseaEditorScreen';

export default function ContractorAdminScreen({ 
  onNavigateBack, 
  businessUnitId, 
  styles,
  businessUnits = []
}) {
  const [activeTab, setActiveTab] = useState('jsea'); // 'jsea' or 'permits'
  const [jseaTemplates, setJseaTemplates] = useState([]);
  const [permitTemplates, setPermitTemplates] = useState([]);
  const [loadingJsea, setLoadingJsea] = useState(false);
  const [loadingPermits, setLoadingPermits] = useState(false);
  const [showJseaEditor, setShowJseaEditor] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingJseaTemplate, setEditingJseaTemplate] = useState(null);
  const [jseaTemplateName, setJseaTemplateName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedBusinessUnitIds, setSelectedBusinessUnitIds] = useState([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [currentJseaSteps, setCurrentJseaSteps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  // JSEA filter states
  const [jseaFilterCompanyId, setJseaFilterCompanyId] = useState(null);
  const [jseaFilterBusinessUnitIds, setJseaFilterBusinessUnitIds] = useState([]);
  const [jseaFilterSiteIds, setJseaFilterSiteIds] = useState([]);
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  // Filter search state
  const [jseaCompanySearch, setJseaCompanySearch] = useState('');
  const [jseaBusinessUnitSearch, setJseaBusinessUnitSearch] = useState('');
  const [jseaSiteSearch, setJseaSiteSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null); // null, 'company', 'businessunit', or 'site'

  // Use first business unit if none is provided
  const effectiveBuId = businessUnitId || businessUnits[0]?.id;

  // Load companies
  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const companiesData = await listCompanies();
      if (Array.isArray(companiesData)) {
        setCompanies(companiesData);
        if (companiesData.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(companiesData[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load sites for selected business units
  const loadSites = async () => {
    if (jseaFilterBusinessUnitIds.length === 0 && !effectiveBuId) return;
    setLoadingSites(true);
    try {
      const buIds = jseaFilterBusinessUnitIds.length > 0 ? jseaFilterBusinessUnitIds : [effectiveBuId];
      const sitesData = await getSitesByBusinessUnits(buIds);
      setSites(sitesData || []);
    } catch (error) {
      console.error('Failed to load sites:', error);
    } finally {
      setLoadingSites(false);
    }
  };

  // Load JSEA templates
  const loadJseaTemplates = async () => {
    if (!effectiveBuId) return;
    setLoadingJsea(true);
    try {
      const response = await getJseaTemplates(effectiveBuId);
      if (response.success) {
        setJseaTemplates(response.data || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load JSEA templates: ' + error.message);
    } finally {
      setLoadingJsea(false);
    }
  };

  // Load Permit templates
  const loadPermitTemplates = async () => {
    if (!effectiveBuId) return;
    setLoadingPermits(true);
    try {
      const response = await getPermitTemplates(effectiveBuId);
      if (response.success) {
        setPermitTemplates(response.data || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load permit templates: ' + error.message);
    } finally {
      setLoadingPermits(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (activeTab === 'jsea') {
      loadJseaTemplates();
      loadSites();
    } else {
      loadPermitTemplates();
    }
  }, [activeTab, effectiveBuId, jseaFilterBusinessUnitIds]);

  // Handle save JSEA template - show modal first
  const handleSaveJseaTemplate = async () => {
    if (!jseaTemplateName.trim()) {
      Alert.alert('Validation', 'Please enter a template name');
      return;
    }
    if (currentJseaSteps.length === 0) {
      Alert.alert('Validation', 'Please add at least one step');
      return;
    }
    if (selectedBusinessUnitIds.length === 0) {
      Alert.alert('Validation', 'Please select at least one business unit');
      return;
    }

    try {
      const response = await saveJseaTemplate(
        jseaTemplateName,
        currentJseaSteps,
        selectedBusinessUnitIds,
        selectedCompanyId,
        selectedSiteIds
      );
      if (response.success) {
        Alert.alert('Success', `Template "${jseaTemplateName}" saved for ${selectedBusinessUnitIds.length} business unit(s)`);
        setShowSaveModal(false);
        setShowJseaEditor(false);
        resetJseaForm();
        loadJseaTemplates();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template: ' + error.message);
    }
  };

  // Open save modal when JSEA steps are ready
  const handleJseaSaved = (steps) => {
    setCurrentJseaSteps(steps);
    setShowJseaEditor(false);
    setShowSaveModal(true);
  };

  // Handle delete JSEA template
  const handleDeleteJseaTemplate = async (templateId) => {
    Alert.alert(
      'Delete Template?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const response = await deleteJseaTemplate(templateId);
              if (response.success) {
                Alert.alert('Success', 'Template deleted');
                loadJseaTemplates();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete template: ' + error.message);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Handle delete permit template
  const handleDeletePermitTemplate = async (templateId) => {
    Alert.alert(
      'Delete Template?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const response = await deletePermitTemplate(templateId);
              if (response.success) {
                Alert.alert('Success', 'Template deleted');
                loadPermitTemplates();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete template: ' + error.message);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Reset JSEA form
  const resetJseaForm = () => {
    setJseaTemplateName('');
    setCurrentJseaSteps([]);
    setEditingJseaTemplate(null);
    setSelectedBusinessUnitIds([]);
    setSelectedCompanyId(null);
    setSelectedSiteIds([]);
    setOpenDropdown(null);
    setJseaCompanySearch('');
    setJseaBusinessUnitSearch('');
    setJseaSiteSearch('');
  };

  // Open JSEA editor for new template
  const handleNewJseaTemplate = () => {
    resetJseaForm();
    setShowJseaEditor(true);
  };

  // Open JSEA editor for editing template
  const handleEditJseaTemplate = (template) => {
    setEditingJseaTemplate(template);
    setJseaTemplateName(template.name);
    setCurrentJseaSteps(template.jsea || []);
    setShowJseaEditor(true);
  };

  // Render JSEA Templates Tab
  const renderJseaTemplates = () => {
    if (loadingJsea) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    // Filter templates based on selected filters
    const filteredTemplates = jseaTemplates.filter(template => {
      // Filter by company if selected
      if (jseaFilterCompanyId && template.company_id !== jseaFilterCompanyId) {
        return false;
      }
      // Filter by business units if selected
      if (jseaFilterBusinessUnitIds.length > 0) {
        const hasMatchingBU = template.business_unit_ids?.some(buId =>
          jseaFilterBusinessUnitIds.includes(buId)
        );
        if (!hasMatchingBU) {
          return false;
        }
      }
      // Filter by sites if selected
      // If no site filter is selected, show all templates regardless of site restriction
      // If site filter is selected, show if:
      // 1. Template has no site restriction (empty site_ids), OR
      // 2. Template has at least one matching site
      if (jseaFilterSiteIds.length > 0) {
        const templateSiteIds = template.site_ids || [];
        if (templateSiteIds.length > 0) {
          const hasMatchingSite = templateSiteIds.some(siteId =>
            jseaFilterSiteIds.includes(siteId)
          );
          if (!hasMatchingSite) {
            return false;
          }
        }
      }
      return true;
    });

    return (
      <ScrollView style={styles.section}>
        <TouchableOpacity 
          style={[styles.addButton, { marginBottom: 16 }]} 
          onPress={handleNewJseaTemplate}
        >
          <Text style={styles.addButtonText}>+ Create New Template</Text>
        </TouchableOpacity>

        {/* Filter Section */}
        <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 16, zIndex: 1000 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 12 }}>Filters</Text>
          
          {/* Company Filter Dropdown */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Company</Text>
            <View style={{ position: 'relative', zIndex: openDropdown === 'company' ? 1300 : 1050 }}>
              <TouchableOpacity
                onPress={() => {
                  if (openDropdown === 'company') {
                    setJseaCompanySearch('');
                  }
                  setOpenDropdown(openDropdown === 'company' ? null : 'company');
                }}
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: 'white',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 13, color: jseaFilterCompanyId ? '#1F2937' : '#9CA3AF' }}>
                  {jseaFilterCompanyId ? companies.find(c => c.id === jseaFilterCompanyId)?.name || 'Select company' : 'All Companies'}
                </Text>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>▼</Text>
              </TouchableOpacity>

              {openDropdown === 'company' && (
                <View style={{
                  position: 'absolute',
                  top: 46,
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  maxHeight: 250,
                  zIndex: 1100
                }}>
                  <TextInput
                    placeholder="Type to search..."
                    value={jseaCompanySearch}
                    onChangeText={setJseaCompanySearch}
                    style={{
                      borderBottomWidth: 1,
                      borderColor: '#E5E7EB',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 12
                    }}
                  />
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      onPress={() => {
                        setJseaFilterCompanyId(null);
                        setOpenDropdown(null);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderColor: '#F3F4F6',
                        backgroundColor: !jseaFilterCompanyId ? '#EEF2FF' : 'white'
                      }}
                    >
                      <Text style={{ fontSize: 12, color: !jseaFilterCompanyId ? '#3B82F6' : '#1F2937', fontWeight: '500' }}>
                        All Companies
                      </Text>
                    </TouchableOpacity>
                    {companies
                      .filter(c => c.name?.toLowerCase().includes(jseaCompanySearch.toLowerCase()))
                      .map(company => (
                        <TouchableOpacity
                          key={company.id}
                          onPress={() => {
                            setJseaFilterCompanyId(company.id);
                            setOpenDropdown(null);
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderColor: '#F3F4F6',
                            backgroundColor: jseaFilterCompanyId === company.id ? '#EEF2FF' : 'white'
                          }}
                        >
                          <Text style={{ fontSize: 12, color: jseaFilterCompanyId === company.id ? '#3B82F6' : '#1F2937' }}>
                            {company.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Business Unit Filter Dropdown */}
          {businessUnits && businessUnits.length > 0 && (
            <View style={{ marginBottom: 12, zIndex: openDropdown === 'businessunit' ? 1300 : 1045 }}>
              <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Business Units</Text>
              <TouchableOpacity
                onPress={() => {
                  if (openDropdown === 'businessunit') {
                    setJseaBusinessUnitSearch('');
                  }
                  setOpenDropdown(openDropdown === 'businessunit' ? null : 'businessunit');
                }}
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: 'white',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 13, color: jseaFilterBusinessUnitIds.length > 0 ? '#1F2937' : '#9CA3AF' }}>
                  {jseaFilterBusinessUnitIds.length === 0
                    ? 'All Business Units'
                    : `${jseaFilterBusinessUnitIds.length} selected`}
                </Text>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>▼</Text>
              </TouchableOpacity>

              {openDropdown === 'businessunit' && (
                <View style={{
                  position: 'absolute',
                  top: 46,
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  maxHeight: 250,
                  zIndex: 1100
                }}>
                  <TextInput
                    placeholder="Type to search..."
                    value={jseaBusinessUnitSearch}
                    onChangeText={setJseaBusinessUnitSearch}
                    style={{
                      borderBottomWidth: 1,
                      borderColor: '#E5E7EB',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 12
                    }}
                  />
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      onPress={() => {
                        setJseaFilterBusinessUnitIds([]);
                        setOpenDropdown(null);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderColor: '#F3F4F6',
                        backgroundColor: jseaFilterBusinessUnitIds.length === 0 ? '#EEF2FF' : 'white'
                      }}
                    >
                      <Text style={{ fontSize: 12, color: jseaFilterBusinessUnitIds.length === 0 ? '#3B82F6' : '#1F2937', fontWeight: '500' }}>
                        All Business Units
                      </Text>
                    </TouchableOpacity>
                    {businessUnits
                      .filter(bu => bu.name?.toLowerCase().includes(jseaBusinessUnitSearch.toLowerCase()))
                      .map(bu => (
                        <TouchableOpacity
                          key={bu.id}
                          onPress={() => {
                            setJseaFilterBusinessUnitIds(prev =>
                              prev.includes(bu.id)
                                ? prev.filter(id => id !== bu.id)
                                : [...prev, bu.id]
                            );
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderColor: '#F3F4F6',
                            backgroundColor: jseaFilterBusinessUnitIds.includes(bu.id) ? '#EEF2FF' : 'white',
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          <View style={{
                            width: 16,
                            height: 16,
                            borderWidth: 2,
                            borderColor: '#3B82F6',
                            borderRadius: 3,
                            backgroundColor: jseaFilterBusinessUnitIds.includes(bu.id) ? '#3B82F6' : 'white',
                            marginRight: 8,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {jseaFilterBusinessUnitIds.includes(bu.id) && (
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>✓</Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 12, color: '#1F2937' }}>{bu.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Site Filter Dropdown */}
          {sites && sites.length > 0 && (
            <View style={{ zIndex: openDropdown === 'site' ? 1300 : 1040 }}>
              <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Sites</Text>
              <TouchableOpacity
                onPress={() => {
                  if (openDropdown === 'site') {
                    setJseaSiteSearch('');
                  }
                  setOpenDropdown(openDropdown === 'site' ? null : 'site');
                }}
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: 'white',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 13, color: jseaFilterSiteIds.length > 0 ? '#1F2937' : '#9CA3AF' }}>
                  {jseaFilterSiteIds.length === 0
                    ? 'All Sites'
                    : `${jseaFilterSiteIds.length} selected`}
                </Text>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>▼</Text>
              </TouchableOpacity>

              {openDropdown === 'site' && (
                <View style={{
                  position: 'absolute',
                  top: 46,
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  maxHeight: 250,
                  zIndex: 1100
                }}>
                  <TextInput
                    placeholder="Type to search..."
                    value={jseaSiteSearch}
                    onChangeText={setJseaSiteSearch}
                    style={{
                      borderBottomWidth: 1,
                      borderColor: '#E5E7EB',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 12
                    }}
                  />
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      onPress={() => {
                        setJseaFilterSiteIds([]);
                        setOpenDropdown(null);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderColor: '#F3F4F6',
                        backgroundColor: jseaFilterSiteIds.length === 0 ? '#EEF2FF' : 'white'
                      }}
                    >
                      <Text style={{ fontSize: 12, color: jseaFilterSiteIds.length === 0 ? '#3B82F6' : '#1F2937', fontWeight: '500' }}>
                        All Sites
                      </Text>
                    </TouchableOpacity>
                    {sites
                      .filter(site => site.name?.toLowerCase().includes(jseaSiteSearch.toLowerCase()))
                      .map(site => (
                        <TouchableOpacity
                          key={site.id}
                          onPress={() => {
                            setJseaFilterSiteIds(prev =>
                              prev.includes(site.id)
                                ? prev.filter(id => id !== site.id)
                                : [...prev, site.id]
                            );
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderColor: '#F3F4F6',
                            backgroundColor: jseaFilterSiteIds.includes(site.id) ? '#EEF2FF' : 'white',
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          <View style={{
                            width: 16,
                            height: 16,
                            borderWidth: 2,
                            borderColor: '#3B82F6',
                            borderRadius: 3,
                            backgroundColor: jseaFilterSiteIds.includes(site.id) ? '#3B82F6' : 'white',
                            marginRight: 8,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {jseaFilterSiteIds.includes(site.id) && (
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>✓</Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 12, color: '#1F2937' }}>{site.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Templates List */}
        {filteredTemplates.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 16, color: '#9CA3AF', fontStyle: 'italic' }}>
              {jseaTemplates.length === 0 ? 'No JSEA templates yet' : 'No templates match current filters'}
            </Text>
          </View>
        ) : (
          filteredTemplates.map((template) => (
            <View 
              key={template.id} 
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                    {template.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                    {template.jsea?.length || 0} step{template.jsea?.length !== 1 ? 's' : ''}
                  </Text>
                  {template.created_at && (
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                      Created: {new Date(template.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: '#3B82F6',
                      padding: 8,
                      borderRadius: 6,
                      minWidth: 50,
                      alignItems: 'center'
                    }}
                    onPress={() => handleEditJseaTemplate(template)}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{
                      backgroundColor: '#EF4444',
                      padding: 8,
                      borderRadius: 6,
                      minWidth: 50,
                      alignItems: 'center'
                    }}
                    onPress={() => handleDeleteJseaTemplate(template.id)}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {template.jsea && template.jsea.length > 0 && (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#D1D5DB' }}>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: '500' }}>Steps:</Text>
                  {template.jsea.slice(0, 3).map((step, idx) => (
                    <Text key={idx} style={{ fontSize: 10, color: '#374151', marginBottom: 2 }}>
                      • {step.description?.substring(0, 70) || 'Step ' + (idx + 1)}
                    </Text>
                  ))}
                  {template.jsea.length > 3 && (
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                      ... and {template.jsea.length - 3} more step{template.jsea.length - 3 !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  // Render Permit Templates Tab
  const renderPermitTemplates = () => {
    if (loadingPermits) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    return (
      <ScrollView style={styles.section}>
        <View style={{ padding: 12, backgroundColor: '#FEF3C7', borderRadius: 6, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: '#92400E' }}>
            💡 Permit templates are saved from the permit form after filling in details. Click "Save as Template" in the permit editing screen.
          </Text>
        </View>

        {permitTemplates.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 16, color: '#9CA3AF', fontStyle: 'italic' }}>
              No permit templates yet
            </Text>
          </View>
        ) : (
          permitTemplates.map((template) => (
            <View 
              key={template.id} 
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                    {template.description || 'Untitled'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                    Type: {template.type || 'General'}
                  </Text>
                  {template.created_at && (
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                      Created: {new Date(template.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#EF4444',
                    padding: 8,
                    borderRadius: 6,
                    minWidth: 50,
                    alignItems: 'center'
                  }}
                  onPress={() => handleDeletePermitTemplate(template.id)}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{ 
        paddingHorizontal: 12, 
        paddingVertical: 12, 
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingTop: 16
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={onNavigateBack}>
            <Text style={{ fontSize: 16, color: '#3B82F6', fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Contractor Admin</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setActiveTab('jsea')}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: activeTab === 'jsea' ? '#3B82F6' : '#E5E7EB',
              borderRadius: 6,
              alignItems: 'center'
            }}
          >
            <Text style={{
              fontWeight: '600',
              fontSize: 13,
              color: activeTab === 'jsea' ? 'white' : '#374151'
            }}>
              JSEA Templates
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('permits')}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: activeTab === 'permits' ? '#3B82F6' : '#E5E7EB',
              borderRadius: 6,
              alignItems: 'center'
            }}
          >
            <Text style={{
              fontWeight: '600',
              fontSize: 13,
              color: activeTab === 'permits' ? 'white' : '#374151'
            }}>
              Permit Templates
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {!effectiveBuId ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
            No business units available. Please contact your administrator.
          </Text>
        </View>
      ) : (
        activeTab === 'jsea' ? renderJseaTemplates() : renderPermitTemplates()
      )}

      {/* JSEA Editor Modal */}
      {showJseaEditor && (
        <Modal
          visible={showJseaEditor}
          animationType="slide"
          onRequestClose={() => {
            setShowJseaEditor(false);
            resetJseaForm();
          }}
        >
          <View style={{ flex: 1 }}>
            {/* Modal Header */}
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: '#F9FAFB',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
              paddingTop: 16
            }}>
              <TouchableOpacity onPress={() => {
                setShowJseaEditor(false);
                resetJseaForm();
              }}>
                <Text style={{ fontSize: 16, color: '#3B82F6', fontWeight: '600' }}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>
                {editingJseaTemplate ? 'Edit JSEA Template' : 'Create JSEA Template'}
              </Text>

              {/* Template Name Input */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Template Name *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937'
                  }}
                  placeholder="e.g., Hot Work - Standard Process"
                  value={jseaTemplateName}
                  onChangeText={setJseaTemplateName}
                />
              </View>
            </View>

            {/* JSEA Editor */}
            <JseaEditorScreen
              initialJsea={currentJseaSteps}
              onSave={(steps) => {
                setCurrentJseaSteps(steps);
              }}
              onCancel={() => {
                setShowJseaEditor(false);
                resetJseaForm();
              }}
              styles={styles}
              isInModal={true}
              hideButtons={true}
            />

            {/* Bottom Buttons */}
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: '#F9FAFB',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              flexDirection: 'row',
              gap: 12
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                onPress={() => {
                  setShowJseaEditor(false);
                  resetJseaForm();
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#10B981',
                  borderRadius: 6,
                  alignItems: 'center'
                }}
                onPress={() => {
                  if (!jseaTemplateName.trim()) {
                    Alert.alert('Validation', 'Please enter a template name');
                    return;
                  }
                  // Show the save modal to select company
                  setShowSaveModal(true);
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Save Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Save Template Modal - Select Company */}
      {showSaveModal && (
        <Modal
          visible={showSaveModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSaveModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              maxHeight: '80%'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Save JSEA Template</Text>
                <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                  <Text style={{ fontSize: 24, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Template Name */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Template Name</Text>
                  <View style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: '#F9FAFB'
                  }}>
                    <Text style={{ fontSize: 14, color: '#1F2937' }}>{jseaTemplateName}</Text>
                  </View>
                </View>

                {/* Company Selection */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Contractor Company</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                    Optional - restrict this template to a specific company
                  </Text>

                  {loadingCompanies ? (
                    <ActivityIndicator size="large" color="#3B82F6" />
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setSelectedCompanyId(null)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: selectedCompanyId === null ? '#3B82F6' : '#E5E7EB',
                          backgroundColor: selectedCompanyId === null ? '#E0E7FF' : '#F9FAFB',
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: '#3B82F6',
                          backgroundColor: selectedCompanyId === null ? '#3B82F6' : 'white',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          {selectedCompanyId === null && (
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>✓</Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>All Companies</Text>
                      </TouchableOpacity>
                      {companies.map((company) => (
                        <TouchableOpacity
                          key={company.id}
                          onPress={() => setSelectedCompanyId(company.id)}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor: selectedCompanyId === company.id ? '#3B82F6' : '#E5E7EB',
                            backgroundColor: selectedCompanyId === company.id ? '#E0E7FF' : '#F9FAFB',
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: '#3B82F6',
                            backgroundColor: selectedCompanyId === company.id ? '#3B82F6' : 'white',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                          }}>
                            {selectedCompanyId === company.id && (
                              <Text style={{ color: 'white', fontWeight: 'bold' }}>✓</Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>{company.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Business Unit Selection */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Business Units *</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                    Select which business units can use this template
                  </Text>

                  <View style={{ gap: 8 }}>
                    {businessUnits && businessUnits.length > 0 ? (
                      businessUnits.map((bu) => (
                        <TouchableOpacity
                          key={bu.id}
                          onPress={() => {
                            setSelectedBusinessUnitIds(prev =>
                              prev.includes(bu.id)
                                ? prev.filter(id => id !== bu.id)
                                : [...prev, bu.id]
                            );
                          }}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor: selectedBusinessUnitIds.includes(bu.id) ? '#3B82F6' : '#E5E7EB',
                            backgroundColor: selectedBusinessUnitIds.includes(bu.id) ? '#E0E7FF' : '#F9FAFB',
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            borderWidth: 2,
                            borderColor: '#3B82F6',
                            backgroundColor: selectedBusinessUnitIds.includes(bu.id) ? '#3B82F6' : 'white',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                          }}>
                            {selectedBusinessUnitIds.includes(bu.id) && (
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>✓</Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>{bu.name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={{ fontSize: 14, color: '#6B7280' }}>No business units available</Text>
                    )}
                  </View>
                </View>

                {/* Site Selection */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Sites (Optional)</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                    Restrict this template to specific sites (leave empty to apply to all sites)
                  </Text>

                  {loadingSites ? (
                    <ActivityIndicator size="large" color="#3B82F6" />
                  ) : (
                    <View style={{ gap: 8 }}>
                      {sites && sites.length > 0 ? (
                        sites.map((site) => (
                          <TouchableOpacity
                            key={site.id}
                            onPress={() => {
                              setSelectedSiteIds(prev =>
                                prev.includes(site.id)
                                  ? prev.filter(id => id !== site.id)
                                  : [...prev, site.id]
                              );
                            }}
                            style={{
                              paddingVertical: 12,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              borderWidth: 2,
                              borderColor: selectedSiteIds.includes(site.id) ? '#3B82F6' : '#E5E7EB',
                              backgroundColor: selectedSiteIds.includes(site.id) ? '#E0E7FF' : '#F9FAFB',
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}
                          >
                            <View style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              borderWidth: 2,
                              borderColor: '#3B82F6',
                              backgroundColor: selectedSiteIds.includes(site.id) ? '#3B82F6' : 'white',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12
                            }}>
                              {selectedSiteIds.includes(site.id) && (
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>✓</Text>
                              )}
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>{site.name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={{ fontSize: 14, color: '#6B7280' }}>No sites available for selected business units</Text>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Save Button */}
              <View style={{ gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 6,
                    alignItems: 'center'
                  }}
                  onPress={() => setShowSaveModal(false)}
                >
                  <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    backgroundColor: '#10B981',
                    borderRadius: 6,
                    alignItems: 'center'
                  }}
                  onPress={handleSaveJseaTemplate}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Save Template</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

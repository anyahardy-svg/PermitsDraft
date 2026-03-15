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
import { getContractorInductionsForCompany } from '../api/inductions';
import JseaEditorScreen from './JseaEditorScreen';
import CompanyAccreditationScreen from './CompanyAccreditationScreen';

export default function ContractorAdminScreen({ 
  onNavigateBack, 
  businessUnitId, 
  styles,
  businessUnits = []
}) {
  const [activeTab, setActiveTab] = useState(null); // null shows dashboard, 'jsea', 'permits', 'accreditation', or 'inductions'
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

  // Inductions states
  const [inductedContractors, setInductedContractors] = useState([]);
  const [loadingInductions, setLoadingInductions] = useState(false);

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

  // Load inductions for selected company
  const loadInductions = async () => {
    if (!selectedCompanyId) {
      setInductedContractors([]);
      return;
    }
    setLoadingInductions(true);
    try {
      const data = await getContractorInductionsForCompany(selectedCompanyId);
      setInductedContractors(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inductions: ' + error.message);
      setInductedContractors([]);
    } finally {
      setLoadingInductions(false);
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

  useEffect(() => {
    if (activeTab === 'inductions') {
      loadInductions();
    }
  }, [activeTab, selectedCompanyId]);

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

    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <TouchableOpacity 
            style={[styles.addButton, { marginBottom: 16 }]} 
            onPress={handleNewJseaTemplate}
          >
            <Text style={styles.addButtonText}>+ Create New Template</Text>
          </TouchableOpacity>

          {jseaTemplates.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>No JSEA templates created yet</Text>
            </View>
          ) : (
            jseaTemplates.map((template) => (
              <View 
                key={template.id} 
                style={{
                  backgroundColor: 'white',
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
      </View>
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

  // Render inductions tab
  const renderInductions = () => {
    if (loadingInductions) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    if (!selectedCompanyId) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
            Please select a company to view inductions
          </Text>
        </View>
      );
    }

    if (inductedContractors.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
            No contractors inducted yet
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
          Showing {inductedContractors.length} contractor{inductedContractors.length !== 1 ? 's' : ''}
        </Text>

        {inductedContractors.map((contractor) => (
          <View
            key={contractor.id}
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 12,
              marginBottom: 12
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 }}>
              {contractor.first_name} {contractor.last_name}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
              {contractor.email || 'No email'}
            </Text>

            {contractor.completedInductions && contractor.completedInductions.length > 0 ? (
              <View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Completed Inductions ({contractor.completedInductions.length}):
                </Text>
                {contractor.completedInductions.map((induction, idx) => (
                  <View key={idx} style={{ paddingLeft: 12, marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, color: '#1F2937' }}>
                      • {induction.inductions?.induction_name || 'Unknown'}
                    </Text>
                    {induction.inductions?.subsection_name && (
                      <Text style={{ fontSize: 10, color: '#6B7280', marginLeft: 4 }}>
                        {induction.inductions.subsection_name}
                      </Text>
                    )}
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                      {induction.completed_at ? new Date(induction.completed_at).toLocaleDateString('en-NZ') : 'Date not available'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                No completed inductions
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={styles.header}>
        {!activeTab && (
          <TouchableOpacity onPress={onNavigateBack}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>
          {activeTab ? (activeTab === 'jsea' ? 'JSEA Templates' : activeTab === 'permits' ? 'Permit Templates' : activeTab === 'inductions' ? 'Inductions' : 'Accreditation') : 'Contractor Admin'}
        </Text>
        {activeTab && (
          <TouchableOpacity onPress={() => setActiveTab(null)}>
            <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>✕</Text>
          </TouchableOpacity>
        )}
        {!activeTab && <View style={{ width: 30 }} />}
      </View>

      {/* Dashboard View - Show cards when no tab selected */}
      {!activeTab ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setActiveTab('jsea')}
              style={[styles.dashboardCard, { borderLeftColor: '#8B5CF6', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>{jseaTemplates.length}</Text>
              <Text style={styles.cardLabel}>JSEA Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('permits')}
              style={[styles.dashboardCard, { borderLeftColor: '#3B82F6', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>{permitTemplates.length}</Text>
              <Text style={styles.cardLabel}>Permit Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('accreditation')}
              style={[styles.dashboardCard, { borderLeftColor: '#10B981', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>📋</Text>
              <Text style={styles.cardLabel}>Accreditation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('inductions')}
              style={[styles.dashboardCard, { borderLeftColor: '#F59E0B', width: '48%' }]}
            >
              <Text style={styles.cardNumber}>{inductedContractors.length}</Text>
              <Text style={styles.cardLabel}>Inducted Contractors</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* Content View - Show selected section */
        !effectiveBuId && activeTab !== 'accreditation' && activeTab !== 'inductions' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
              No business units available. Please contact your administrator.
            </Text>
          </View>
        ) : activeTab === 'accreditation' ? (
          <View style={{ flex: 1 }}>
            <CompanyAccreditationScreen
              companyId={null}
              isAdmin={false}
              styles={styles}
              onClose={() => setActiveTab(null)}
            />
          </View>
        ) : activeTab === 'inductions' ? (
          renderInductions()
        ) : (
          activeTab === 'jsea' ? renderJseaTemplates() : renderPermitTemplates()
        )
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
                <Text style={{ fontSize: 24, color: '#3B82F6', fontWeight: '600' }}>←</Text>
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

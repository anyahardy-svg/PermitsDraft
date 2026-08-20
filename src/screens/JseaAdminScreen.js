import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  getAllJseaTemplates,
  saveJseaTemplate,
  updateJseaTemplate,
  deleteJseaTemplate,
} from '../api/templates';
import { listBusinessUnits } from '../api/business_units';
import { listCompanies } from '../api/companies';
import JseaEditorScreen from './JseaEditorScreen';

/**
 * JseaAdminScreen - Staff admin CRUD for JSEA templates
 */
export default function JseaAdminScreen({ onBack, styles }) {
  const [templates, setTemplates] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterCompanyId, setFilterCompanyId] = useState(null);
  const [filterBusinessUnitId, setFilterBusinessUnitId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showEditor, setShowEditor] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [currentSteps, setCurrentSteps] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedBusinessUnitIds, setSelectedBusinessUnitIds] = useState([]);

  const jseaEditorRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesResponse, buData, companiesData] = await Promise.all([
        getAllJseaTemplates(),
        listBusinessUnits(),
        listCompanies(),
      ]);

      if (templatesResponse.success) {
        setTemplates(templatesResponse.data || []);
      } else {
        throw new Error(templatesResponse.error || 'Failed to load JSEA templates');
      }

      setBusinessUnits(Array.isArray(buData) ? buData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (err) {
      console.error('Error loading JSEA admin data:', err);
      Alert.alert('Error', err.message || 'Failed to load JSEA templates');
    } finally {
      setLoading(false);
    }
  };

  const getCompanyName = (companyId) => {
    if (!companyId) return 'All companies';
    return companies.find((company) => company.id === companyId)?.name || 'Unknown company';
  };

  const getBusinessUnitNames = (businessUnitIds = []) => {
    if (!businessUnitIds.length) return 'All business units';
    const names = businessUnitIds
      .map((id) => businessUnits.find((bu) => bu.id === id)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : 'All business units';
  };

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      if (filterCompanyId && template.company_id !== filterCompanyId) {
        return false;
      }
      if (
        filterBusinessUnitId &&
        template.business_unit_ids?.length > 0 &&
        !template.business_unit_ids.includes(filterBusinessUnitId)
      ) {
        return false;
      }
      if (query && !template.name?.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [templates, filterCompanyId, filterBusinessUnitId, searchQuery]);

  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setCurrentSteps([]);
    setSelectedCompanyId(null);
    setSelectedBusinessUnitIds([]);
  };

  const handleCreateTemplate = () => {
    resetForm();
    setCurrentSteps([{ id: 1, description: '', hazards: '', controls: '' }]);
    setShowEditor(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name || '');
    setCurrentSteps(template.jsea || []);
    setSelectedCompanyId(template.company_id || null);
    setSelectedBusinessUnitIds(template.business_unit_ids || []);
    setShowEditor(true);
  };

  const handleOpenSaveModal = () => {
    const steps = jseaEditorRef.current?.getSteps?.() || currentSteps;

    if (!templateName.trim()) {
      Alert.alert('Validation', 'Please enter a template name');
      return;
    }
    if (!steps.length) {
      Alert.alert('Validation', 'Please add at least one step');
      return;
    }

    setCurrentSteps(steps);
    setShowSaveModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!selectedBusinessUnitIds.length) {
      Alert.alert('Validation', 'Please select at least one business unit');
      return;
    }

    try {
      setSaving(true);
      let response;

      if (editingTemplate) {
        response = await updateJseaTemplate(
          editingTemplate.id,
          templateName.trim(),
          currentSteps,
          selectedBusinessUnitIds,
          selectedCompanyId,
          []
        );
      } else {
        response = await saveJseaTemplate(
          templateName.trim(),
          currentSteps,
          selectedBusinessUnitIds,
          selectedCompanyId,
          []
        );
      }

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to save template');
      }

      Alert.alert(
        'Success',
        editingTemplate ? 'JSEA template updated' : 'JSEA template created'
      );
      setShowSaveModal(false);
      setShowEditor(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error('Error saving JSEA template:', err);
      Alert.alert('Error', err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = (template) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setIsDeleting(true);
      const response = await deleteJseaTemplate(templateToDelete.id);
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to delete template');
      }
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
      await loadData();
      Alert.alert('Success', 'JSEA template deleted');
    } catch (err) {
      console.error('Error deleting JSEA template:', err);
      Alert.alert('Error', err.message || 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleBusinessUnit = (businessUnitId) => {
    setSelectedBusinessUnitIds((current) =>
      current.includes(businessUnitId)
        ? current.filter((id) => id !== businessUnitId)
        : [...current, businessUnitId]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>JSEA Templates</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' }}>
          <Text style={{ fontSize: 13, color: '#1E40AF' }}>
            Manage reusable JSEA templates used when creating permits. Templates can be scoped to specific companies and business units.
          </Text>
        </View>

        <TouchableOpacity
          style={{ backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 }}
          onPress={handleCreateTemplate}
        >
          <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>+ Create JSEA Template</Text>
        </TouchableOpacity>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search templates..."
          placeholderTextColor="#9CA3AF"
          style={{
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: '#1F2937',
            backgroundColor: 'white',
            marginBottom: 12,
          }}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setFilterCompanyId(null)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: filterCompanyId === null ? '#3B82F6' : '#E5E7EB',
            }}
          >
            <Text style={{ color: filterCompanyId === null ? 'white' : '#374151', fontSize: 12, fontWeight: '600' }}>
              All companies
            </Text>
          </TouchableOpacity>
          {companies.slice(0, 8).map((company) => (
            <TouchableOpacity
              key={company.id}
              onPress={() => setFilterCompanyId(filterCompanyId === company.id ? null : company.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: filterCompanyId === company.id ? '#3B82F6' : '#E5E7EB',
              }}
            >
              <Text style={{ color: filterCompanyId === company.id ? 'white' : '#374151', fontSize: 12, fontWeight: '600' }}>
                {company.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setFilterBusinessUnitId(null)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: filterBusinessUnitId === null ? '#F97316' : '#E5E7EB',
            }}
          >
            <Text style={{ color: filterBusinessUnitId === null ? 'white' : '#374151', fontSize: 12, fontWeight: '600' }}>
              All business units
            </Text>
          </TouchableOpacity>
          {businessUnits.map((businessUnit) => (
            <TouchableOpacity
              key={businessUnit.id}
              onPress={() =>
                setFilterBusinessUnitId(
                  filterBusinessUnitId === businessUnit.id ? null : businessUnit.id
                )
              }
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: filterBusinessUnitId === businessUnit.id ? '#F97316' : '#E5E7EB',
              }}
            >
              <Text
                style={{
                  color: filterBusinessUnitId === businessUnit.id ? 'white' : '#374151',
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {businessUnit.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredTemplates.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 14, color: '#9CA3AF' }}>No JSEA templates found</Text>
          </View>
        ) : (
          filteredTemplates.map((template) => (
            <View
              key={template.id}
              style={{
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>{template.name}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    {template.jsea?.length || 0} step{(template.jsea?.length || 0) !== 1 ? 's' : ''}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    Company: {getCompanyName(template.company_id)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Business units: {getBusinessUnitNames(template.business_unit_ids)}
                  </Text>
                  {template.created_at && (
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                      Created: {new Date(template.created_at).toLocaleDateString('en-NZ')}
                    </Text>
                  )}
                </View>
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 }}
                    onPress={() => handleEditTemplate(template)}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 }}
                    onPress={() => handleDeleteTemplate(template)}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {template.jsea?.length > 0 && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                  {template.jsea.slice(0, 3).map((step, index) => (
                    <Text key={`${template.id}-step-${index}`} style={{ fontSize: 11, color: '#374151', marginBottom: 2 }}>
                      • {step.description?.substring(0, 80) || `Step ${index + 1}`}
                    </Text>
                  ))}
                  {template.jsea.length > 3 && (
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      ... and {template.jsea.length - 3} more step{template.jsea.length - 3 !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showEditor} animationType="slide" onRequestClose={() => setShowEditor(false)}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                setShowEditor(false);
                resetForm();
              }}
            >
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {editingTemplate ? 'Edit JSEA Template' : 'Create JSEA Template'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Template Name *</Text>
            <TextInput
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="e.g., Hot Work - Standard Process"
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: '#1F2937',
                backgroundColor: 'white',
              }}
            />
          </View>

          <JseaEditorScreen
            ref={jseaEditorRef}
            initialJsea={currentSteps}
            hideButtons
            isInModal
            styles={styles}
          />

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              backgroundColor: 'white',
            }}
          >
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 12, backgroundColor: '#E5E7EB', borderRadius: 8, alignItems: 'center' }}
              onPress={() => {
                setShowEditor(false);
                resetForm();
              }}
            >
              <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 12, backgroundColor: '#10B981', borderRadius: 8, alignItems: 'center' }}
              onPress={handleOpenSaveModal}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>
              Save JSEA Template
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                Business Units *
              </Text>
              <View style={{ marginBottom: 16, gap: 8 }}>
                {businessUnits.map((businessUnit) => {
                  const selected = selectedBusinessUnitIds.includes(businessUnit.id);
                  return (
                    <TouchableOpacity
                      key={businessUnit.id}
                      onPress={() => toggleBusinessUnit(businessUnit.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderWidth: 1.5,
                          borderColor: selected ? '#F97316' : '#D1D5DB',
                          borderRadius: 3,
                          marginRight: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? '#F97316' : 'white',
                        }}
                      >
                        {selected && <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 14, color: '#1F2937' }}>{businessUnit.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                Company (optional)
              </Text>
              <View style={{ marginBottom: 8, gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedCompanyId(null)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderWidth: 1.5,
                      borderColor: selectedCompanyId === null ? '#F97316' : '#D1D5DB',
                      borderRadius: 3,
                      marginRight: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selectedCompanyId === null ? '#F97316' : 'white',
                    }}
                  >
                    {selectedCompanyId === null && (
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, color: '#1F2937' }}>All companies</Text>
                </TouchableOpacity>
                {companies.map((company) => {
                  const selected = selectedCompanyId === company.id;
                  return (
                    <TouchableOpacity
                      key={company.id}
                      onPress={() => setSelectedCompanyId(selected ? null : company.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderWidth: 1.5,
                          borderColor: selected ? '#F97316' : '#D1D5DB',
                          borderRadius: 3,
                          marginRight: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? '#F97316' : 'white',
                        }}
                      >
                        {selected && <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 14, color: '#1F2937' }}>{company.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, backgroundColor: '#E5E7EB', borderRadius: 8, alignItems: 'center' }}
                onPress={() => setShowSaveModal(false)}
                disabled={saving}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, backgroundColor: '#F97316', borderRadius: 8, alignItems: 'center' }}
                onPress={handleSaveTemplate}
                disabled={saving}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Delete JSEA Template?</Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              Are you sure you want to delete "{templateToDelete?.name}"? This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 6, backgroundColor: '#E5E7EB', alignItems: 'center' }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteTemplate}
                disabled={isDeleting}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 6, backgroundColor: '#DC2626', alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
import JseaEditorScreen from './JseaEditorScreen';

export default function ContractorAdminScreen({ 
  onNavigateBack, 
  currentUser, 
  businessUnitId, 
  styles 
}) {
  const [activeTab, setActiveTab] = useState('jsea'); // 'jsea' or 'permits'
  const [jseaTemplates, setJseaTemplates] = useState([]);
  const [permitTemplates, setPermitTemplates] = useState([]);
  const [loadingJsea, setLoadingJsea] = useState(false);
  const [loadingPermits, setLoadingPermits] = useState(false);
  const [showJseaEditor, setShowJseaEditor] = useState(false);
  const [editingJseaTemplate, setEditingJseaTemplate] = useState(null);
  const [jseaTemplateName, setJseaTemplateName] = useState('');
  const [currentJseaSteps, setCurrentJseaSteps] = useState([]);

  // Load JSEA templates
  const loadJseaTemplates = async () => {
    if (!businessUnitId) return;
    setLoadingJsea(true);
    try {
      const response = await getJseaTemplates(businessUnitId);
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
    if (!businessUnitId) return;
    setLoadingPermits(true);
    try {
      const response = await getPermitTemplates(businessUnitId);
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
    if (activeTab === 'jsea') {
      loadJseaTemplates();
    } else {
      loadPermitTemplates();
    }
  }, [activeTab, businessUnitId]);

  // Handle save JSEA template
  const handleSaveJseaTemplate = async () => {
    if (!jseaTemplateName.trim()) {
      Alert.alert('Validation', 'Please enter a template name');
      return;
    }
    if (currentJseaSteps.length === 0) {
      Alert.alert('Validation', 'Please add at least one step');
      return;
    }

    try {
      if (editingJseaTemplate) {
        // Update existing template
        const response = await updateJseaTemplate(
          editingJseaTemplate.id,
          jseaTemplateName,
          currentJseaSteps
        );
        if (response.success) {
          Alert.alert('Success', 'JSEA template updated');
          setShowJseaEditor(false);
          resetJseaForm();
          loadJseaTemplates();
        }
      } else {
        // Create new template
        const response = await saveJseaTemplate(
          jseaTemplateName,
          currentJseaSteps,
          businessUnitId
        );
        if (response.success) {
          Alert.alert('Success', 'JSEA template saved');
          setShowJseaEditor(false);
          resetJseaForm();
          loadJseaTemplates();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save template: ' + error.message);
    }
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
      <ScrollView style={styles.section}>
        <TouchableOpacity 
          style={[styles.addButton, { marginBottom: 16 }]} 
          onPress={handleNewJseaTemplate}
        >
          <Text style={styles.addButtonText}>+ Create New Template</Text>
        </TouchableOpacity>

        {jseaTemplates.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 16, color: '#9CA3AF', fontStyle: 'italic' }}>
              No JSEA templates yet
            </Text>
          </View>
        ) : (
          jseaTemplates.map((template) => (
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
      {activeTab === 'jsea' ? renderJseaTemplates() : renderPermitTemplates()}

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
                onPress={handleSaveJseaTemplate}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                  {editingJseaTemplate ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

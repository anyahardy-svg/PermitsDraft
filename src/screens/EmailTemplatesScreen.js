import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { getAllEmailTemplates, updateEmailTemplate, getEmailTemplate } from '../api/emailTemplates';

const { width } = Dimensions.get('window');

const VARIABLE_DESCRIPTIONS = {
  contactName: 'Primary contact name. Use as Dear {{contactName}}, — defaults to "Contractor" when no name is set.',
  companyName: 'Company name',
  deadline: 'Accreditation deadline',
  signupUrl: 'Sign-up link for new contractors',
  supportEmail: 'Support email address',
  adminName: 'Admin user name',
  setupUrl: 'Password setup link',
  resetUrl: 'Password reset link',
};

const getTemplateVariables = (template) => {
  const variables = Array.isArray(template?.variables) ? [...template.variables] : [];
  if (template?.type === 'invitation' && !variables.includes('contactName')) {
    variables.push('contactName');
  }
  return variables;
};

const EmailTemplatesScreen = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    description: '',
  });

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const result = await getAllEmailTemplates();
    if (result.success) {
      setTemplates(result.data);
      if (result.data.length > 0) {
        selectTemplate(result.data[0]);
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to load templates');
    }
    setLoading(false);
  };

  const selectTemplate = async (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      description: template.description || '',
    });
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.html_content.trim()) {
      Alert.alert('Validation Error', 'Name, subject, and HTML content are required');
      return;
    }

    setLoading(true);
    const result = await updateEmailTemplate(selectedTemplate.type, {
      name: formData.name,
      subject: formData.subject,
      html_content: formData.html_content,
      description: formData.description,
      updated_by: 'admin',
    });

    if (result.success) {
      Alert.alert('Success', 'Email template updated successfully');
      setEditMode(false);
      loadTemplates();
    } else {
      Alert.alert('Error', result.error || 'Failed to save template');
    }
    setLoading(false);
  };

  const handleCancel = () => {
    if (selectedTemplate) {
      selectTemplate(selectedTemplate);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.title}>📧 Email Templates</Text>
          <Text style={styles.subtitle}>Draft and manage email templates used throughout the system</Text>
        </View>

        {/* Template List */}
        <View style={styles.templateList}>
          <Text style={styles.sectionTitle}>Available Templates</Text>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateItem,
                selectedTemplate?.id === template.id && styles.templateItemActive,
              ]}
              onPress={() => selectTemplate(template)}
              disabled={loading}
            >
              <View style={styles.templateItemContent}>
                <Text style={styles.templateItemName}>{template.name}</Text>
                <Text style={styles.templateItemType}>{template.type}</Text>
              </View>
              {selectedTemplate?.id === template.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Template Editor */}
        {selectedTemplate && (
          <View style={styles.editorSection}>
            <View style={styles.editorHeader}>
              <View>
                <Text style={styles.editorTitle}>{selectedTemplate.name}</Text>
                <Text style={styles.editorSubtitle}>
                  Type: <Text style={styles.typeCode}>{selectedTemplate.type}</Text>
                </Text>
              </View>
              {!editMode && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditMode(true)}
                  disabled={loading}
                >
                  <Text style={styles.editButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedTemplate.description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Description:</Text>
                <Text style={styles.descriptionText}>{selectedTemplate.description}</Text>
              </View>
            )}

            {selectedTemplate && getTemplateVariables(selectedTemplate).length > 0 && (
              <View style={styles.variablesBox}>
                <Text style={styles.variablesLabel}>Available Variables:</Text>
                <View style={styles.variablesList}>
                  {getTemplateVariables(selectedTemplate).map((variable) => (
                    <View key={variable} style={styles.variableRow}>
                      <Text style={styles.variableItem}>
                        {`{{${variable}}}`}
                      </Text>
                      {VARIABLE_DESCRIPTIONS[variable] && (
                        <Text style={styles.variableDescription}>
                          {VARIABLE_DESCRIPTIONS[variable]}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {editMode ? (
              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Template Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="e.g., Accreditation Invitation"
                    editable={!loading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Subject Line</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.subject}
                    onChangeText={(text) => setFormData({ ...formData, subject: text })}
                    placeholder="e.g., {{companyName}} - Complete Your Accreditation"
                    editable={!loading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email Description</Text>
                  <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="What is this email for?"
                    multiline
                    editable={!loading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>HTML Content</Text>
                  <TextInput
                    style={[styles.input, styles.htmlInput]}
                    value={formData.html_content}
                    onChangeText={(text) => setFormData({ ...formData, html_content: text })}
                    placeholder="Enter HTML email template..."
                    multiline
                    editable={!loading}
                  />
                  <Text style={styles.htmlHint}>
                    💡 Tip: Use {'{{variableName}}'} for dynamic content. For greetings, use {'Dear {{contactName}},'} — it becomes Dear Contractor, when no contact name is on file.
                  </Text>
                </View>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSave}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? '💾 Saving...' : '💾 Save Changes'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>✕ Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.preview}>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Subject:</Text>
                  <Text style={styles.previewContent}>{formData.subject}</Text>
                </View>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>HTML Content:</Text>
                  <View style={styles.htmlPreview}>
                    <Text style={styles.htmlPreviewText}>{formData.html_content.substring(0, 500)}...</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  templateList: {
    marginBottom: 24,
  },
  templateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  templateItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  templateItemContent: {
    flex: 1,
  },
  templateItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  templateItemType: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  editorSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  editorSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  typeCode: {
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  descriptionBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
  },
  variablesBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  variablesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  variablesList: {
    gap: 8,
  },
  variableRow: {
    gap: 4,
  },
  variableItem: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#92400e',
  },
  variableDescription: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  form: {
    marginTop: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 10,
    backgroundColor: 'white',
    fontSize: 13,
    color: '#1f2937',
  },
  descriptionInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  htmlInput: {
    minHeight: 200,
    fontFamily: 'monospace',
    fontSize: 12,
    textAlignVertical: 'top',
  },
  htmlHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  preview: {
    marginTop: 12,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  previewContent: {
    fontSize: 13,
    color: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  htmlPreview: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  htmlPreviewText: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default EmailTemplatesScreen;

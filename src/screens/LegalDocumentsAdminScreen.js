import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { getLegalDocument, getLegalDocumentVersions, updateLegalDocument } from '../api/legal-documents';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
    fontFamily: 'System',
  },
  richTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 12,
    minHeight: 300,
    textAlignVertical: 'top',
    fontFamily: 'System',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontWeight: '600',
    fontSize: 14,
  },
  warningButton: {
    backgroundColor: '#FEE2E2',
  },
  warningButtonText: {
    color: '#991B1B',
    fontWeight: '600',
    fontSize: 14,
  },
  versionHistory: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
  },
  versionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  versionItemLast: {
    borderBottomWidth: 0,
  },
  versionText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  versionLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  activeVersionBadge: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#0EA5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },
  previewBox: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  previewText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 20,
  },
});

export default function LegalDocumentsAdminScreen({ onNavigateBack, styles: parentStyles }) {
  const [currentDocument, setCurrentDocument] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [documentType] = useState('h_s_agreement');

  useEffect(() => {
    loadDocument();
  }, []);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await getLegalDocument(documentType);
      const versionHistory = await getLegalDocumentVersions(documentType);
      
      setCurrentDocument(doc);
      setEditedContent(doc?.document_content || '');
      setEditedTitle(doc?.document_title || '');
      setVersions(versionHistory);
    } catch (error) {
      console.error('Error loading document:', error);
      Alert.alert('Error', 'Failed to load legal document');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedContent.trim()) {
      Alert.alert('Validation Error', 'Document content cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await updateLegalDocument(documentType, {
        document_title: editedTitle,
        document_content: editedContent,
      });
      
      Alert.alert('Success', 'Legal document updated successfully');
      await loadDocument();
      setShowPreview(false);
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save legal document');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (currentDocument) {
      setEditedContent(currentDocument.document_content);
      setEditedTitle(currentDocument.document_title);
      Alert.alert('Discarded', 'Changes have been discarded');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading legal documents...</Text>
      </View>
    );
  }

  const hasChanges = 
    editedContent !== currentDocument?.document_content ||
    editedTitle !== currentDocument?.document_title;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Legal Documents Management</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Edit the Health & Safety Agreement text below. Changes are automatically versioned and can be rolled back if needed.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>H&S Agreement Content</Text>

        <Text style={styles.label}>Document Title</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter document title"
          value={editedTitle}
          onChangeText={setEditedTitle}
          editable={!saving}
        />

        <Text style={styles.label}>Document Content</Text>
        <TextInput
          style={styles.richTextInput}
          placeholder="Enter full agreement text here"
          value={editedContent}
          onChangeText={setEditedContent}
          multiline={true}
          editable={!saving}
          textAlignVertical="top"
        />

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setShowPreview(!showPreview)}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {showPreview ? 'Hide Preview' : 'Preview'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleDiscard}
            disabled={saving || !hasChanges}
          >
            <Text style={styles.secondaryButtonText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSave}
            disabled={saving || !hasChanges}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {showPreview && (
          <View>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>{editedContent}</Text>
            </View>
          </View>
        )}

        {versions && versions.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Version History</Text>
            <View style={styles.versionHistory}>
              <FlatList
                data={versions}
                keyExtractor={(item, idx) => `${item.id}-${idx}`}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View style={[styles.versionItem, index === versions.length - 1 && styles.versionItemLast]}>
                    <Text style={styles.versionText}>
                      <Text style={{ fontWeight: '600' }}>Version {item.version_number}</Text>
                      {' · '}
                      {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                    </Text>
                    {item.is_active && (
                      <View style={styles.activeVersionBadge}>
                        <Text style={styles.badgeText}>CURRENT VERSION</Text>
                      </View>
                    )}
                  </View>
                )}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { marginTop: 24 }]}
          onPress={onNavigateBack}
          disabled={saving}
        >
          <Text style={styles.secondaryButtonText}>Back to Admin</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

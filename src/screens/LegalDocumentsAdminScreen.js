import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { 
  getLegalDocument, 
  getLegalDocumentVersions, 
  updateLegalDocument,
  getAllLegalDocuments,
  createLegalDocument 
} from '../api/legal-documents';

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  backButton: {
    fontSize: 24,
    color: '#FFFFFF',
    marginRight: 12,
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
  successButton: {
    backgroundColor: '#10B981',
  },
  successButtonText: {
    color: '#FFFFFF',
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
  documentListItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentListItemContent: {
    flex: 1,
  },
  documentListItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  documentListItemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#6B7280',
  },
});

export default function LegalDocumentsAdminScreen({ onNavigateBack, isSuperAdmin = false }) {
  const [documents, setDocuments] = useState([]);
  const [editingDocument, setEditingDocument] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocumentType, setNewDocumentType] = useState('');
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [newDocumentContent, setNewDocumentContent] = useState('');
  const [creatingDocument, setCreatingDocument] = useState(false);

  useEffect(() => {
    loadAllDocuments();
  }, []);

  const loadAllDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getAllLegalDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load legal documents');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocument = async (documentType) => {
    try {
      const doc = await getLegalDocument(documentType);
      const versionHistory = await getLegalDocumentVersions(documentType);
      
      setEditingDocument(documentType);
      setEditedContent(doc?.document_content || '');
      setEditedTitle(doc?.document_title || '');
      setVersions(versionHistory);
    } catch (error) {
      console.error('Error loading document for edit:', error);
      Alert.alert('Error', 'Failed to load legal document');
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocumentType.trim()) {
      Alert.alert('Validation Error', 'Document type is required');
      return;
    }
    if (!newDocumentTitle.trim()) {
      Alert.alert('Validation Error', 'Document title is required');
      return;
    }
    if (!newDocumentContent.trim()) {
      Alert.alert('Validation Error', 'Document content is required');
      return;
    }

    try {
      setCreatingDocument(true);
      await createLegalDocument(newDocumentType, newDocumentTitle, newDocumentContent);
      
      Alert.alert('Success', 'Legal document created successfully');
      setNewDocumentType('');
      setNewDocumentTitle('');
      setNewDocumentContent('');
      setShowCreateModal(false);
      await loadAllDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
      Alert.alert('Error', 'Failed to create legal document');
    } finally {
      setCreatingDocument(false);
    }
  };

  const handleSave = async () => {
    if (!editedContent.trim()) {
      Alert.alert('Validation Error', 'Document content cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await updateLegalDocument(editingDocument, {
        document_title: editedTitle,
        document_content: editedContent,
      });
      
      Alert.alert('Success', 'Legal document updated successfully');
      setEditingDocument(null);
      setEditedContent('');
      setEditedTitle('');
      setVersions([]);
      await loadAllDocuments();
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save legal document');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    const doc = documents.find(d => d.document_type === editingDocument);
    if (doc) {
      setEditedContent(doc.document_content || '');
      setEditedTitle(doc.document_title || '');
      setShowPreview(false);
    }
  };

  const handleCancel = () => {
    setEditingDocument(null);
    setEditedContent('');
    setEditedTitle('');
    setVersions([]);
    setShowPreview(false);
  };

  // ===== LIST VIEW =====
  if (!editingDocument) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Legal Documents Management</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Click on any document to edit and manage versions.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>Documents</Text>
                {isSuperAdmin && (
                  <TouchableOpacity
                    style={[styles.button, styles.successButton, { flex: 0, width: 'auto', paddingHorizontal: 12 }]}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Text style={styles.successButtonText}>+ New</Text>
                  </TouchableOpacity>
                )}
              </View>

              {documents.length === 0 ? (
                <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginVertical: 24 }}>
                  No documents yet. {isSuperAdmin ? 'Create one to get started.' : 'Contact admin to create documents.'}
                </Text>
              ) : (
                documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.document_type}
                    style={styles.documentListItem}
                    onPress={() => handleEditDocument(doc.document_type)}
                  >
                    <View style={styles.documentListItemContent}>
                      <Text style={styles.documentListItemTitle}>
                        {doc.document_title}
                      </Text>
                      <Text style={styles.documentListItemSubtitle}>
                        v{doc.version_number || 1} · Updated {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 20, marginLeft: 12 }}>→</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { marginTop: 24 }]}
            onPress={onNavigateBack}
          >
            <Text style={styles.secondaryButtonText}>Back to Admin</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* CREATE DOCUMENT MODAL */}
        <Modal
          visible={showCreateModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => !creatingDocument && setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => !creatingDocument && setShowCreateModal(false)}
                disabled={creatingDocument}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Create New Document</Text>

              <Text style={styles.label}>Document Type (Identifier)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., h_s_agreement, induction_terms"
                value={newDocumentType}
                onChangeText={setNewDocumentType}
                editable={!creatingDocument}
              />

              <Text style={styles.label}>Document Title (Display Name)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Health & Safety Agreement"
                value={newDocumentTitle}
                onChangeText={setNewDocumentTitle}
                editable={!creatingDocument}
              />

              <Text style={styles.label}>Document Content</Text>
              <TextInput
                style={styles.richTextInput}
                placeholder="Enter document content here"
                value={newDocumentContent}
                onChangeText={setNewDocumentContent}
                multiline={true}
                editable={!creatingDocument}
                textAlignVertical="top"
              />

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => !creatingDocument && setShowCreateModal(false)}
                  disabled={creatingDocument}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleCreateDocument}
                  disabled={creatingDocument}
                >
                  <Text style={styles.primaryButtonText}>
                    {creatingDocument ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  // ===== EDIT VIEW =====
  const currentDoc = documents.find(d => d.document_type === editingDocument);
  const hasChanges =
    editedContent !== currentDoc?.document_content ||
    editedTitle !== currentDoc?.document_title;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} disabled={saving}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentDoc?.document_title || 'Document'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
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
          placeholder="Enter document content here"
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
      </ScrollView>
    </View>
  );
}

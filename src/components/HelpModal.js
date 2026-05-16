import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getLegalDocument } from '../api/legal-documents';
import MarkdownRenderer from './MarkdownRenderer';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '95%',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  documentContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1F2937',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  notFoundSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default function HelpModal({ 
  visible, 
  onClose, 
  documentType = 'contractor_manual',
  title = '📖 Help & Documentation'
}) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      loadDocument();
    }
  }, [visible, documentType]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const doc = await getLegalDocument(documentType);
      if (!doc) {
        setError('Documentation not found');
        setDocument(null);
      } else {
        setDocument(doc);
      }
    } catch (err) {
      console.error('Error loading help document:', err);
      setError('Failed to load documentation. Please try again.');
      setDocument(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading documentation...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={loadDocument}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : document ? (
              <>
                {document.document_title && (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
                    {document.document_title}
                  </Text>
                )}
                <MarkdownRenderer text={document.document_content || ''} />
                <View style={{ height: 16 }} />
              </>
            ) : (
              <View style={styles.notFoundContainer}>
                <Text style={styles.notFoundText}>📚 Documentation Not Available</Text>
                <Text style={styles.notFoundSubtext}>
                  Please contact your administrator to access the documentation.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

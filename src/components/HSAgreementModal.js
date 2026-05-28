import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { getLegalDocument } from '../api/legal-documents';
import { recordHSAgreementAcceptance } from '../api/legal-documents';

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: screenHeight * 0.95,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  documentBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    marginBottom: 12,
  },
  documentText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    fontFamily: 'System',
  },
  readMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginHorizontal: -12,
    marginBottom: -12,
  },
  readMoreText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
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
  },
  signaturePadContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  signaturePad: {
    width: '100%',
    height: 150,
    backgroundColor: '#FFFFFF',
  },
  signatureInstructions: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    textAlign: 'center',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    flex: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontWeight: '600',
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: '#2563EB',
  },
  acceptButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
  },
});

export default function HSAgreementModal({
  visible,
  companyId,
  companyName,
  onAccept,
  onCancel,
}) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const signatureRef = useRef(null);

  useEffect(() => {
    if (visible) {
      loadDocument();
      resetForm();
    }
  }, [visible]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await getLegalDocument('h_s_agreement');
      setDocument(doc);
    } catch (error) {
      console.error('Error loading H&S agreement:', error);
      Alert.alert('Error', 'Failed to load agreement document');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSignedName('');
    setAgreed(false);
    setHasSignature(false);
    setSignatureData(null);
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
      setHasSignature(false);
    }
  };

  const handleSignatureStart = () => {
    // Called when user starts drawing
    setHasSignature(true);
  };

  const handleSignatureEnd = (signature) => {
    // Called when signature is completed
    if (signature) {
      setHasSignature(true);
    }
  };

  const handleAccept = async () => {
    // Validation
    if (!signedName.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    if (!hasSignature || !signatureData) {
      Alert.alert('Required', 'Please sign the document');
      return;
    }

    if (!agreed) {
      Alert.alert('Required', 'Please check the acknowledgement box');
      return;
    }

    try {
      setSaving(true);

      await recordHSAgreementAcceptance(companyId, {
        signature: signatureData,
        acceptedBy: signedName.trim(),
      });

      Alert.alert('Success', 'Health & Safety Agreement accepted');
      onAccept?.();
    } catch (error) {
      console.error('Error recording H&S agreement:', error);
      Alert.alert('Error', 'Failed to save agreement acceptance');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Health & Safety Agreement</Text>
            <Text style={styles.headerSubtitle}>
              {companyName || 'Company Name'}
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading agreement...</Text>
              </View>
            ) : document ? (
              <>
                {/* Warning */}
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ This is a required agreement. You must review, sign, and accept before proceeding.
                  </Text>
                </View>

                {/* Document Preview */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Agreement</Text>
                  <View style={styles.documentBox}>
                    <Text style={styles.documentText}>
                      {document.document_content.substring(0, 400)}...
                    </Text>
                    <TouchableOpacity style={styles.readMoreButton}>
                      <Text style={styles.readMoreText}>Read Full Document</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Full Document in Modal (for reference) */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Full Text</Text>
                  <View style={styles.documentBox}>
                    <Text style={styles.documentText}>
                      {document.document_content}
                    </Text>
                  </View>
                </View>

                {/* Name Field */}
                <View style={styles.section}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    value={signedName}
                    onChangeText={setSignedName}
                    editable={!saving}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Signature Pad */}
                <View style={styles.section}>
                  <Text style={styles.label}>Signature *</Text>
                  <View style={styles.signaturePadContainer}>
                    <SignatureScreen
                      ref={signatureRef}
                      onOK={(signature) => {
                        setSignatureData(signature);
                        setHasSignature(true);
                      }}
                      onEmpty={() => {
                        setHasSignature(false);
                        setSignatureData(null);
                      }}
                      onBegin={handleSignatureStart}
                      descriptionText=""
                      clearText="Clear Signature"
                      confirmText="Accept Signature"
                      webStyle={`
                        .m-signature-pad {
                          box-shadow: none;
                          border: none;
                          background-color: #FFFFFF;
                        }
                        .m-signature-pad--body {
                          border: none;
                          background-color: #FFFFFF;
                          height: 150px;
                        }
                        .m-signature-pad--footer {
                          display: none;
                        }
                      `}
                    />
                    <Text style={styles.signatureInstructions}>
                      Sign above with your mouse or trackpad
                    </Text>
                  </View>
                  {hasSignature && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={clearSignature}
                      disabled={saving}
                    >
                      <Text style={styles.clearButtonText}>Clear Signature</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Acknowledgement Checkbox */}
                <View style={styles.section}>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={[styles.checkbox, agreed && styles.checkboxChecked]}
                      onPress={() => setAgreed(!agreed)}
                      disabled={saving}
                    >
                      {agreed && (
                        <Text style={{ fontSize: 16, color: '#FFFFFF' }}>✓</Text>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.checkboxText}>
                      I/We acknowledge that I/we have read and understood the foregoing
                      Health, Safety and Environmental information and undertake that
                      my/our workers will at all times comply with relevant legislation
                      and with all applicable health, safety and environmental procedures,
                      requirements, and instructions.
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ❌ Failed to load agreement document
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          {!loading && (
            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.acceptButton,
                  saving && styles.acceptButtonDisabled,
                ]}
                onPress={handleAccept}
                disabled={saving || !hasSignature || !agreed || !signedName.trim()}
              >
                <Text style={styles.acceptButtonText}>
                  {saving ? 'Saving...' : 'Accept & Sign'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

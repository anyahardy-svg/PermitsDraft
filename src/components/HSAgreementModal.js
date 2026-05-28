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
    flex: 1,
    flexDirection: 'column',
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
    height: 160,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      loadDocument();
      resetForm();
    }
  }, [visible]);

  // Initialize canvas when modal opens
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      
      if (!canvas || !container) return;

      // Get actual rendered container size
      const rect = container.getBoundingClientRect();
      const actualWidth = Math.max(rect.width, 300);
      const actualHeight = 120;

      // Set canvas resolution (drawing surface)
      canvas.width = actualWidth;
      canvas.height = actualHeight;

      // Set canvas display size to match exactly
      canvas.style.width = `${actualWidth}px`;
      canvas.style.height = `${actualHeight}px`;

      // Get context and set it up
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, actualWidth, actualHeight);

      contextRef.current = ctx;
    }, 100);

    return () => clearTimeout(timer);
  }, [visible]);

  // Setup canvas event listeners
  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (!canvas || !ctx) return;

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);

      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      ctx.closePath();
      const signatureDataUrl = canvas.toDataURL('image/png');
      setSignatureData(signatureDataUrl);
      setHasSignature(true);
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      ctx.closePath();
      const signatureDataUrl = canvas.toDataURL('image/png');
      setSignatureData(signatureDataUrl);
      setHasSignature(true);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
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
    // Clear canvas
    if (canvasRef.current && contextRef.current) {
      contextRef.current.fillStyle = 'white';
      contextRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const clearSignature = () => {
    if (canvasRef.current && contextRef.current) {
      contextRef.current.fillStyle = 'white';
      contextRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSignature(false);
      setSignatureData(null);
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

          {/* Content - Document + Name in ScrollView */}
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
              </>
            ) : (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  ❌ Failed to load agreement document
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Signature Pad - OUTSIDE ScrollView */}
          {!loading && document && (
            <>
              <View style={styles.section}>
                <Text style={[styles.label, { paddingHorizontal: 16 }]}>Signature *</Text>
                <div style={{
                  borderWidth: 2,
                  borderColor: '#E5E7EB',
                  borderRadius: 6,
                  backgroundColor: '#F9FAFB',
                  marginBottom: 12,
                  marginLeft: 16,
                  marginRight: 16,
                  overflow: 'hidden',
                  height: 160,
                  position: 'relative'
                }} ref={canvasContainerRef}>
                  <canvas
                    ref={canvasRef}
                    style={{
                      cursor: hasSignature ? 'default' : 'crosshair',
                      display: 'block',
                      touchAction: 'none',
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </div>
                <Text style={styles.signatureInstructions}>
                  Sign above with your mouse or trackpad
                </Text>
                {hasSignature && (
                  <TouchableOpacity
                    style={[styles.clearButton, { marginHorizontal: 16 }]}
                    onPress={clearSignature}
                    disabled={saving}
                  >
                    <Text style={styles.clearButtonText}>Clear Signature</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Acknowledgement Checkbox - OUTSIDE ScrollView */}
              <View style={[styles.section, { paddingHorizontal: 16 }]}>
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
          )}

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

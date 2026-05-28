import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getLegalDocument } from '../api/legal-documents';
import { recordHSAgreementAcceptance } from '../api/legal-documents';

// Canvas signature pad component - matches WebSignaturePad exactly
function CanvasSignaturePad({ signatureRef, onSignatureChange }) {
  const canvasRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const isDrawingRef = React.useRef(false);
  const contextRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || contextRef.current) return;

    const container = containerRef.current;
    let actualWidth = 300;
    let actualHeight = 160;
    
    if (container) {
      const rect = container.getBoundingClientRect();
      actualWidth = Math.max(rect.width, 300);
      actualHeight = Math.max(rect.height, 160);
    }

    canvas.width = actualWidth;
    canvas.height = actualHeight;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${actualHeight}px`;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, actualWidth, actualHeight);

    contextRef.current = ctx;

    if (signatureRef) {
      signatureRef.current = {
        canvas: canvas,
        toDataURL: () => canvas.toDataURL('image/png'),
        clear: () => {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      };
    }
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const ctx = contextRef.current;

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
      if (onSignatureChange) onSignatureChange();
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
      if (onSignatureChange) onSignatureChange();
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
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #E5E7EB',
          borderRadius: '8px',
          backgroundColor: 'white',
          cursor: 'crosshair',
          display: 'block',
          touchAction: 'none',
          maxWidth: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}

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
  const signaturePadRef = useRef(null);

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
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
    setHasSignature(false);
  };

  const handleAccept = async () => {
    if (!signedName.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    if (!hasSignature || !signaturePadRef.current) {
      Alert.alert('Required', 'Please sign the document');
      return;
    }

    if (!agreed) {
      Alert.alert('Required', 'Please check the acknowledgement box');
      return;
    }

    try {
      setSaving(true);
      const sig = signaturePadRef.current.toDataURL();
      await recordHSAgreementAcceptance(companyId, {
        signature: sig,
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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          width: '100%',
          maxHeight: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#1F2937',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
            Health & Safety Agreement
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            {companyName || 'Company Name'}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 12,
            paddingBottom: 12,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', paddingVertical: 32 }}>
              <div style={{ fontSize: 14, color: '#6B7280' }}>Loading agreement...</div>
            </div>
          ) : document ? (
            <>
              {/* Warning */}
              <div
                style={{
                  backgroundColor: '#FEF3C7',
                  borderLeftWidth: 4,
                  borderLeftColor: '#F59E0B',
                  borderLeftStyle: 'solid',
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, color: '#92400E' }}>
                  ⚠️ This is a required agreement. You must review, sign, and accept before proceeding.
                </div>
              </div>

              {/* Document */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
                  Agreement
                </div>
                <div
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: 12,
                    maxHeight: 300,
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                    {document.document_content}
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>
                  Full Name *
                </div>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  disabled={saving}
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderStyle: 'solid',
                    borderRadius: 6,
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 10,
                    paddingBottom: 10,
                    fontSize: 14,
                    color: '#1F2937',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          ) : (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                borderLeftWidth: 4,
                borderLeftColor: '#DC2626',
                borderLeftStyle: 'solid',
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: 12, color: '#991B1B' }}>
                ❌ Failed to load agreement document
              </div>
            </div>
          )}
        </div>

        {/* Signature Section - OUTSIDE scrollable area */}
        {!loading && document && (
          <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', borderTopStyle: 'solid' }}>
            <div style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 }}>
              Signature *
            </div>
            <CanvasSignaturePad 
              signatureRef={signaturePadRef}
              onSignatureChange={() => {
                if (signaturePadRef.current) {
                  setHasSignature(true);
                }
              }}
            />
            <div style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic', paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, backgroundColor: '#F3F4F6', textAlign: 'center', borderRadius: 4, marginBottom: 12 }}>
              Sign above with your mouse or trackpad
            </div>
            {hasSignature && (
              <button 
                onClick={clearSignature}
                disabled={saving}
                style={{ 
                  paddingTop: 8, 
                  paddingBottom: 8, 
                  paddingLeft: 12, 
                  paddingRight: 12, 
                  backgroundColor: '#FEE2E2', 
                  borderRadius: 4, 
                  border: 'none', 
                  cursor: saving ? 'not-allowed' : 'pointer', 
                  width: '100%', 
                  fontSize: 12, 
                  color: '#991B1B', 
                  fontWeight: '600',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                Clear Signature
              </button>
            )}

            {/* Acknowledgement Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
              <button
                onClick={() => setAgreed(!agreed)}
                disabled={saving}
                style={{
                  width: 20,
                  height: 20,
                  borderWidth: 2,
                  borderColor: '#D1D5DB',
                  borderStyle: 'solid',
                  borderRadius: 4,
                  marginRight: 10,
                  marginTop: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: agreed ? '#2563EB' : '#FFFFFF',
                  color: '#FFFFFF',
                  fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {agreed ? '✓' : ''}
              </button>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, flex: 1 }}>
                I/We acknowledge that I/we have read and understood the foregoing
                Health, Safety and Environmental information and undertake that
                my/our workers will at all times comply with relevant legislation
                and with all applicable health, safety and environmental procedures,
                requirements, and instructions.
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        {!loading && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              paddingLeft: 16,
              paddingRight: 16,
              paddingBottom: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              borderTopStyle: 'solid',
            }}
          >
            <button
              onClick={onCancel}
              disabled={saving}
              style={{
                flex: 1,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 6,
                backgroundColor: '#E5E7EB',
                border: '1px solid #D1D5DB',
                borderStyle: 'solid',
                color: '#1F2937',
                fontWeight: '600',
                fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={saving || !hasSignature || !agreed || !signedName.trim()}
              style={{
                flex: 1,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 6,
                backgroundColor: (saving || !hasSignature || !agreed || !signedName.trim()) ? '#D1D5DB' : '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: '600',
                fontSize: 14,
                cursor: (saving || !hasSignature || !agreed || !signedName.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Accept & Sign'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

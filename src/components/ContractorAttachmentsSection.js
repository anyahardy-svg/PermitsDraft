import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  deleteCompanyAttachment,
  deleteContractorAttachment,
  loadCompanyAttachments,
  loadContractorAttachments,
  openContractorAttachment,
  uploadCompanyAttachment,
  uploadContractorAttachment,
} from '../api/contractorAttachments';

export default function ContractorAttachmentsSection({
  contractorId,
  companyId = null,
  companyName = '',
  contractorName = '',
  styles = {},
  disabled = false,
  hint = 'Upload PDFs or images such as traffic management plans, method statements, or other supporting documents.',
  onAttachmentsChange = null,
}) {
  const useCompanyAttachments = !contractorId && !!companyId;
  const attachmentOwnerReady = !!(contractorId || companyId);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState('');

  const refresh = useCallback(async () => {
    if (!attachmentOwnerReady) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    try {
      const rows = useCompanyAttachments
        ? await loadCompanyAttachments(companyId)
        : await loadContractorAttachments(contractorId);
      setAttachments(rows);
    } catch (error) {
      console.error('Failed to load contractor attachments:', error);
      Alert.alert('Error', error?.message || 'Could not load attachments');
    } finally {
      setLoading(false);
    }
  }, [attachmentOwnerReady, companyId, contractorId, useCompanyAttachments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handlePickFile = () => {
    if (!attachmentOwnerReady || disabled) {
      Alert.alert(
        'Cannot upload yet',
        useCompanyAttachments
          ? 'Your company profile is still loading. Please try again in a moment.'
          : 'Create or save this contractor record before uploading attachments.',
      );
      return;
    }

    if (typeof document === 'undefined') {
      Alert.alert('Unavailable', 'File upload is only supported on web.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setUploading(true);
      try {
        const updated = useCompanyAttachments
          ? await uploadCompanyAttachment({
            companyId,
            companyName,
            file,
            label,
          })
          : await uploadContractorAttachment({
            contractorId,
            companyName,
            contractorName,
            file,
            label,
          });
        setAttachments(updated);
        onAttachmentsChange?.(updated);
        setLabel('');
        Alert.alert('Success', 'Attachment uploaded');
      } catch (error) {
        Alert.alert('Upload failed', error?.message || 'Could not upload file');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleOpen = async (attachment) => {
    try {
      await openContractorAttachment(attachment.path);
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not open file');
    }
  };

  const handleDelete = (attachment) => {
    const title = attachment.label || attachment.name || 'this attachment';
    const confirmed = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`Remove "${title}"?`)
      : true;
    if (!confirmed) {
      return;
    }

    (async () => {
      setUploading(true);
      try {
        const updated = useCompanyAttachments
          ? await deleteCompanyAttachment(companyId, attachment.id)
          : await deleteContractorAttachment(contractorId, attachment.id);
        setAttachments(updated);
        onAttachmentsChange?.(updated);
      } catch (error) {
        Alert.alert('Error', error?.message || 'Could not delete attachment');
      } finally {
        setUploading(false);
      }
    })();
  };

  const labelStyle = styles.label || { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 };
  const inputStyle = styles.input || {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: 'white',
  };

  return (
    <View style={{ marginTop: 8, marginBottom: 16 }}>
      <Text style={[labelStyle, { marginTop: 12 }]}>Attachments</Text>
      <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 12 }}>{hint}</Text>

      {!attachmentOwnerReady ? (
        <View style={{ padding: 12, backgroundColor: '#FEF3C7', borderRadius: 6 }}>
          <Text style={{ color: '#92400E', fontSize: 13 }}>
            {companyId
              ? 'Your company profile is still loading. Please wait a moment and try again.'
              : 'Save this contractor first, then you can upload attachments.'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
            Description (optional)
          </Text>
          <TextInput
            style={[inputStyle, { marginBottom: 10 }]}
            placeholder="e.g. Traffic management plan"
            value={label}
            onChangeText={setLabel}
            editable={!disabled && !uploading}
          />

          <TouchableOpacity
            onPress={handlePickFile}
            disabled={disabled || uploading}
            style={{
              backgroundColor: disabled || uploading ? '#9CA3AF' : '#6366F1',
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: 'white', fontWeight: '600' }}>Upload attachment</Text>
            )}
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color="#6366F1" />
          ) : attachments.length === 0 ? (
            <Text style={{ color: '#6B7280', fontSize: 13 }}>No attachments yet.</Text>
          ) : (
            attachments.map((attachment) => (
              <View
                key={attachment.id}
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                  {attachment.label || attachment.name}
                </Text>
                {attachment.label ? (
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{attachment.name}</Text>
                ) : null}
                {attachment.uploadedAt ? (
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    {new Date(attachment.uploadedAt).toLocaleString('en-NZ')}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleOpen(attachment)}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#DBEAFE', borderRadius: 4 }}
                  >
                    <Text style={{ color: '#1D4ED8', fontWeight: '600', fontSize: 12 }}>View</Text>
                  </TouchableOpacity>
                  {!disabled ? (
                    <TouchableOpacity
                      onPress={() => handleDelete(attachment)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 4 }}
                    >
                      <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 12 }}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}

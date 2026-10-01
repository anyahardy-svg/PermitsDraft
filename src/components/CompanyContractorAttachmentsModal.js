import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  countCompanyContractorAttachments,
  loadCompanyContractorAttachments,
  openContractorAttachment,
} from '../api/contractorAttachments';

export default function CompanyContractorAttachmentsModal({
  visible,
  company,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  const refresh = useCallback(async () => {
    if (!visible || !company?.id) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await loadCompanyContractorAttachments(company.id);
      setGroups(rows);
    } catch (error) {
      console.error('Failed to load company contractor attachments:', error);
      Alert.alert('Error', error?.message || 'Could not load attachments');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [visible, company?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalCount = countCompanyContractorAttachments(groups);

  const handleOpen = async (attachment) => {
    try {
      await openContractorAttachment(attachment.path);
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not open file');
    }
  };

  if (!visible || !company) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View
          style={{
            backgroundColor: '#6366F1',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#4F46E5',
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>
              {company.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#E0E7FF', marginTop: 4 }}>
              Contractor attachments
              {loading ? '' : ` · ${totalCount} file${totalCount === 1 ? '' : 's'}`}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ fontSize: 24, color: 'white', fontWeight: '600' }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 24 }} />
          ) : groups.length === 0 ? (
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                padding: 20,
              }}
            >
              <Text style={{ color: '#6B7280', textAlign: 'center', fontSize: 14 }}>
                No contractor attachments for this company yet.
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <View
                key={group.contractorId || 'company-documents'}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  marginBottom: 16,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    backgroundColor: '#EEF2FF',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
                    {group.contractorName}
                  </Text>
                  {group.contractorEmail ? (
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {group.contractorEmail}
                    </Text>
                  ) : null}
                </View>

                {group.attachments.map((attachment, index) => (
                  <View
                    key={attachment.id}
                    style={{
                      padding: 14,
                      borderBottomWidth: index < group.attachments.length - 1 ? 1 : 0,
                      borderBottomColor: '#F3F4F6',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                      {attachment.label || attachment.name}
                    </Text>
                    {attachment.label ? (
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {attachment.name}
                      </Text>
                    ) : null}
                    {attachment.uploadedAt ? (
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        {new Date(attachment.uploadedAt).toLocaleString('en-NZ')}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => handleOpen(attachment)}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: '#DBEAFE',
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ color: '#1D4ED8', fontWeight: '600', fontSize: 12 }}>
                        View file
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

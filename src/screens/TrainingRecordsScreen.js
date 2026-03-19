/**
 * Training Records Screen
 * Allows contractors to upload and view training/certification records
 * Training types are free text (e.g., "OSHA Certification", "First Aid")
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  uploadTrainingRecord,
  getTrainingRecords,
  deleteTrainingRecord,
  updateTrainingRecordStatus
} from '../api/trainingRecords';

export default function TrainingRecordsScreen({
  contractorId,
  contractorName,
  services = [],
  styles,
  onClose,
  contractors = []
}) {
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState(contractorId);
  const [selectedContractorName, setSelectedContractorName] = useState(contractorName);
  const [formData, setFormData] = useState({
    trainingType: '',
    notes: '',
    expiryDate: ''
  });

  // Load training records on mount or when contractor changes
  useEffect(() => {
    if (selectedContractorId) {
      loadTrainingRecords();
    }
  }, [selectedContractorId]);

  const loadTrainingRecords = async () => {
    setLoading(true);
    try {
      const response = await getTrainingRecords(selectedContractorId);
      if (response.success) {
        setTrainingRecords(response.data);
      }
    } catch (error) {
      console.error('Error loading training records:', error);
      Alert.alert('Error', 'Failed to load training records');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async () => {
    if (!formData.trainingType.trim()) {
      Alert.alert('Validation', 'Please enter a training type');
      return;
    }

    // Web file input - use browser's file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf, image/*, .doc, .docx, .xls, .xlsx';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(true);
      try {
        const response = await uploadTrainingRecord(
          selectedContractorId,
          formData.trainingType,
          file,
          formData.expiryDate ? new Date(formData.expiryDate) : null,
          formData.notes
        );

        if (response.success) {
          Alert.alert('Success', `Training record uploaded for ${formData.trainingType}`);
          setFormData({ trainingType: '', notes: '', expiryDate: '' });
          setShowUploadForm(false);
          await loadTrainingRecords();
        } else {
          Alert.alert('Error', response.error);
        }
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };

    input.click();
  };

  const handleDeleteRecord = async (recordId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const record = trainingRecords.find(r => r.id === recordId);
      const response = await deleteTrainingRecord(recordId, record?.file_url);

      if (response.success) {
        Alert.alert('Success', 'Training record deleted');
        await loadTrainingRecords();
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'expired':
        return '#F59E0B';
      case 'pending':
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Show all records (no filtering by type - user will see all their training records)
  const filteredRecords = trainingRecords;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Training Records</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{selectedContractorName}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contractor Selector - if none selected */}
      {!selectedContractorId && (
        <View style={{ backgroundColor: '#FEF3C7', padding: 16, borderBottomWidth: 1, borderBottomColor: '#FCD34D' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E', marginBottom: 8 }}>
            Select a Contractor
          </Text>
          <Text style={{ fontSize: 12, color: '#B45309', marginBottom: 8 }}>
            Please select a contractor from the inducted contractors list to view and manage their training records.
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#F59E0B',
              padding: 10,
              borderRadius: 6,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
              ← Back to Select Contractor
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}

      {!loading && selectedContractorId && (
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Upload Button */}
          <TouchableOpacity
            onPress={() => setShowUploadForm(!showUploadForm)}
            style={{
              backgroundColor: '#3B82F6',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 16
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>+ Upload Training Record</Text>
          </TouchableOpacity>

          {/* Upload Form */}
          {showUploadForm && (
            <View style={{
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB'
            }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Training Type *
                </Text>
                <TextInput
                  placeholder="e.g., OSHA Certification, First Aid, Safety Training"
                  value={formData.trainingType}
                  onChangeText={(text) => setFormData({ ...formData, trainingType: text })}
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937'
                  }}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Expiry Date (optional)
                </Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={formData.expiryDate}
                  onChangeText={(text) => setFormData({ ...formData, expiryDate: text })}
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937'
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                  Notes (optional)
                </Text>
                <TextInput
                  placeholder="Add any notes about this record..."
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#1F2937'
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleFileSelect}
                disabled={loading || !formData.trainingType.trim()}
                style={{
                  backgroundColor: '#10B981',
                  padding: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                  marginBottom: 8,
                  opacity: !formData.trainingType.trim() || loading ? 0.5 : 1
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {loading ? 'Uploading...' : '📁 Select File'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowUploadForm(false)}
                style={{
                  backgroundColor: '#E5E7EB',
                  padding: 12,
                  borderRadius: 6,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Training Records List */}
          {filteredRecords.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
                No training records uploaded yet
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredRecords.map((record) => (
                <View
                  key={record.id}
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    padding: 12
                  }}
                >
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                          {record.training_type}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                          📄 {record.file_name}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: getStatusColor(record.status),
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 4,
                          marginLeft: 8
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                          {getStatusLabel(record.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ gap: 4, marginBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>
                      Size: {(record.file_size / 1024).toFixed(2)} KB
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>
                      Uploaded: {new Date(record.uploaded_at).toLocaleDateString()}
                    </Text>
                    {record.expiry_date && (
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>
                        Expires: {new Date(record.expiry_date).toLocaleDateString()}
                      </Text>
                    )}
                    {record.notes && (
                      <Text style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' }}>
                        Note: {record.notes}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {record.file_url && (
                      <TouchableOpacity
                        onPress={() => window.open(record.file_url, '_blank')}
                        style={{
                          flex: 1,
                          backgroundColor: '#3B82F6',
                          padding: 8,
                          borderRadius: 6,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>View</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteRecord(record.id, record.file_name)}
                      style={{
                        flex: 1,
                        backgroundColor: '#EF4444',
                        padding: 8,
                        borderRadius: 6,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Training Records Screen
 * Displays a table of training records and allows adding new records
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
  Modal,
  FlatList,
} from 'react-native';
import {
  uploadTrainingRecord,
  getTrainingRecordsByCompany,
  deleteTrainingRecord,
  updateTrainingRecord,
  updateCompanyTrainingRecordsStatus,
} from '../api/trainingRecords';
import { getContractorInductionsForCompany } from '../api/inductions';
import { listAllServices } from '../api/services';

export default function TrainingRecordsScreen({
  loggedInCompanyId,
  styles,
  onClose,
  onStatusChanged,  // Callback when training records status changes
}) {
  // Table state
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Update form state
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [updateSelectedFile, setUpdateSelectedFile] = useState(null);
  const [updateExpiryDate, setUpdateExpiryDate] = useState('');

  // Form state
  const [inductedContractors, setInductedContractors] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState(null);
  const [selectedContractorName, setSelectedContractorName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [trainingName, setTrainingName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Dropdown visibility
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (loggedInCompanyId) {
      loadAllData();
    }
  }, [loggedInCompanyId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load inducted contractors
      const contractors = await getContractorInductionsForCompany(loggedInCompanyId);
      setInductedContractors(contractors || []);

      // Load services
      const services = await listAllServices();
      setAllServices(services || []);

      // Load all training records for the company
      const response = await getTrainingRecordsByCompany(loggedInCompanyId);
      if (response.success && response.data) {
        const recordsWithContractorNames = response.data.map(record => ({
          ...record,
          contractor_name: record.contractor?.name || 'Unknown'
        }));
        setTrainingRecords(recordsWithContractorNames);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedContractorId(null);
    setSelectedContractorName('');
    setSelectedServiceId(null);
    setSelectedServiceName('');
    setTrainingName('');
    setExpiryDate('');
    setSelectedFile(null);
    setShowContractorDropdown(false);
    setShowServiceDropdown(false);
  };

  const formatDateNZ = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseNZDate = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString;
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  };

  const handleSelectFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf, image/*';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setSelectedFile(file);
      }
    };

    input.click();
  };

  const handleAddTrainingRecord = async () => {
    // Validate form
    if (!selectedContractorId) {
      Alert.alert('Validation', 'Please select a contractor');
      return;
    }
    if (!selectedServiceId) {
      Alert.alert('Validation', 'Please select a service');
      return;
    }
    if (!trainingName.trim()) {
      Alert.alert('Validation', 'Please enter a training name');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Validation', 'Please attach a file');
      return;
    }

    setLoading(true);
    try {
      const response = await uploadTrainingRecord(
        selectedContractorId,
        trainingName,
        selectedFile,
        expiryDate ? new Date(parseNZDate(expiryDate)) : null,
        selectedServiceId // Store service_id in notes
      );

      if (response.success) {
        Alert.alert('Success', `Training record added for ${selectedContractorName}`);
        resetForm();
        setShowAddForm(false);
        await loadAllData();
        
        // Update company training records status
        await updateCompanyTrainingRecordsStatus(loggedInCompanyId);
        
        // Notify parent component of status change
        if (onStatusChanged) {
          onStatusChanged(loggedInCompanyId);
        }
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
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
        await loadAllData();
        
        // Update company training records status
        await updateCompanyTrainingRecordsStatus(loggedInCompanyId);
        
        // Notify parent component of status change
        if (onStatusChanged) {
          onStatusChanged(loggedInCompanyId);
        }
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUpdateFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf, image/*';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setUpdateSelectedFile(file);
      }
    };

    input.click();
  };

  const handleUpdateRecord = async () => {
    // Validate: at least one field must be updated
    if (!updateSelectedFile && !updateExpiryDate.trim()) {
      Alert.alert('Validation', 'Please select a new file or update the expiry date');
      return;
    }

    setLoading(true);
    try {
      const expiryDateParam = updateExpiryDate ? new Date(parseNZDate(updateExpiryDate)) : null;
      const response = await updateTrainingRecord(
        editingRecordId,
        updateSelectedFile,
        expiryDateParam
      );

      if (response.success) {
        Alert.alert('Success', 'Training record updated');
        setEditingRecordId(null);
        setUpdateSelectedFile(null);
        setUpdateExpiryDate('');
        await loadAllData();
        
        // Update company training records status
        await updateCompanyTrainingRecordsStatus(loggedInCompanyId);
        
        // Notify parent component of status change
        if (onStatusChanged) {
          onStatusChanged(loggedInCompanyId);
        }
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Training Records</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => setShowAddForm(true)}
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>+ Add Record</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !showAddForm ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : trainingRecords.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
            No training records yet. Click "Add Record" to get started.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ padding: 16 }}>
              {/* Table Header */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#F3F4F6',
                  borderBottomWidth: 2,
                  borderBottomColor: '#D1D5DB',
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  minWidth: 1100,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 150, paddingRight: 8 }}>Contractor</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 180, paddingRight: 8 }}>Training Name</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 120, paddingRight: 8 }}>Expiry Date</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 100, paddingRight: 8 }}>File</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 80, paddingRight: 8 }}>Status</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 160, paddingRight: 8 }}>Actions</Text>
              </View>

              {/* Table Rows */}
              {trainingRecords.map((record, idx) => (
                <View
                  key={record.id}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    minWidth: 1100,
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#1F2937', width: 150, paddingRight: 8 }}>
                    {record.contractor_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#1F2937', width: 180, paddingRight: 8 }}>
                    {record.training_type}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#1F2937', width: 120, paddingRight: 8 }}>
                    {formatDateNZ(record.expiry_date)}
                  </Text>
                  <TouchableOpacity
                    style={{ width: 100, paddingRight: 8 }}
                    onPress={() => window.open(record.file_url, '_blank')}
                  >
                    <Text style={{ fontSize: 11, color: '#3B82F6', textDecorationLine: 'underline' }}>
                      {record.file_name?.split('/').pop()}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: '#1F2937', width: 80, paddingRight: 8 }}>
                    {record.status?.charAt(0).toUpperCase() + record.status?.slice(1) || 'Pending'}
                  </Text>
                  <View style={{ width: 160, paddingRight: 8, flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingRecordId(record.id);
                        setUpdateSelectedFile(null);
                        setUpdateExpiryDate('');
                      }}
                      style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}
                    >
                      <Text style={{ fontSize: 10, color: '#6366F1', fontWeight: '600' }}>Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRecord(record.id, record.file_name)}
                      style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}
                    >
                      <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Add Training Record Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        onRequestClose={() => {
          setShowAddForm(false);
          resetForm();
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {/* Modal Header */}
          <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 20 }}>
            <TouchableOpacity onPress={() => {
              setShowAddForm(false);
              resetForm();
            }}>
              <Text style={{ fontSize: 24, color: '#3B82F6', fontWeight: '600' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>Add Training Record</Text>
          </View>

          {/* Form */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Contractor Selector */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Contractor *</Text>
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: 'white',
                }}
                onPress={() => setShowContractorDropdown(!showContractorDropdown)}
              >
                <Text style={{ fontSize: 14, color: selectedContractorId ? '#1F2937' : '#9CA3AF' }}>
                  {selectedContractorName || 'Select a contractor'}
                </Text>
              </TouchableOpacity>

              {showContractorDropdown && (
                <View style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  marginTop: 4,
                  backgroundColor: 'white',
                  maxHeight: 200,
                }}>
                  <FlatList
                    data={inductedContractors}
                    keyExtractor={(item) => item.id}
                    scrollEnabled
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                        onPress={() => {
                          setSelectedContractorId(item.id);
                          setSelectedContractorName(item.name);
                          setShowContractorDropdown(false);
                        }}
                      >
                        <Text style={{ fontSize: 14, color: '#1F2937' }}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>

            {/* Service Selector */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Service *</Text>
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: 'white',
                }}
                onPress={() => setShowServiceDropdown(!showServiceDropdown)}
              >
                <Text style={{ fontSize: 14, color: selectedServiceId ? '#1F2937' : '#9CA3AF' }}>
                  {selectedServiceName || 'Select a service'}
                </Text>
              </TouchableOpacity>

              {showServiceDropdown && (
                <View style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  marginTop: 4,
                  backgroundColor: 'white',
                  maxHeight: 200,
                }}>
                  <FlatList
                    data={allServices}
                    keyExtractor={(item) => item.id}
                    scrollEnabled
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                        onPress={() => {
                          setSelectedServiceId(item.id);
                          setSelectedServiceName(item.name);
                          setShowServiceDropdown(false);
                        }}
                      >
                        <Text style={{ fontSize: 14, color: '#1F2937' }}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>

            {/* Training Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Training Name *</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#1F2937',
                }}
                placeholder="e.g., OSHA Certification, First Aid"
                value={trainingName}
                onChangeText={setTrainingName}
              />
            </View>

            {/* Expiry Date */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Expiry Date</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#1F2937',
                }}
                placeholder="dd/mm/yyyy"
                value={expiryDate}
                onChangeText={setExpiryDate}
              />
            </View>

            {/* File Attachment */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Attachment (PDF or Image) *</Text>
              <TouchableOpacity
                style={{
                  borderWidth: 2,
                  borderColor: selectedFile ? '#10B981' : '#D1D5DB',
                  borderStyle: 'dashed',
                  borderRadius: 6,
                  paddingVertical: 20,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  backgroundColor: selectedFile ? '#F0FDF4' : 'white',
                }}
                onPress={handleSelectFile}
              >
                <Text style={{ fontSize: 12, color: selectedFile ? '#10B981' : '#6B7280', marginBottom: 4 }}>
                  {selectedFile ? '✓ ' + selectedFile.name : '📎 Tap to attach file'}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>PDF and image files only</Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddTrainingRecord}
                disabled={loading}
                style={{
                  flex: 1,
                  backgroundColor: loading ? '#D1D5DB' : '#3B82F6',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Add Record</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Update Training Record Modal */}
      <Modal
        visible={editingRecordId !== null}
        animationType="slide"
        onRequestClose={() => {
          setEditingRecordId(null);
          setUpdateSelectedFile(null);
          setUpdateExpiryDate('');
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {/* Modal Header */}
          <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 20 }}>
            <TouchableOpacity onPress={() => {
              setEditingRecordId(null);
              setUpdateSelectedFile(null);
              setUpdateExpiryDate('');
            }}>
              <Text style={{ fontSize: 24, color: '#6366F1', fontWeight: '600' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>Update Training Record</Text>
          </View>

          {/* Form */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              Upload a new certificate to replace the expired one. The record status will be reset to pending and require re-approval.
            </Text>

            {/* New Expiry Date */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>New Expiry Date (Optional)</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#1F2937',
                }}
                placeholder="dd/mm/yyyy"
                value={updateExpiryDate}
                onChangeText={setUpdateExpiryDate}
              />
            </View>

            {/* New File Attachment */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>New Certificate (Optional)</Text>
              <TouchableOpacity
                style={{
                  borderWidth: 2,
                  borderColor: updateSelectedFile ? '#10B981' : '#D1D5DB',
                  borderStyle: 'dashed',
                  borderRadius: 6,
                  paddingVertical: 20,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  backgroundColor: updateSelectedFile ? '#F0FDF4' : 'white',
                }}
                onPress={handleSelectUpdateFile}
              >
                <Text style={{ fontSize: 12, color: updateSelectedFile ? '#10B981' : '#6B7280', marginBottom: 4 }}>
                  {updateSelectedFile ? '✓ ' + updateSelectedFile.name : '📎 Tap to attach new file'}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>PDF and image files only</Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setEditingRecordId(null);
                  setUpdateSelectedFile(null);
                  setUpdateExpiryDate('');
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateRecord}
                disabled={loading}
                style={{
                  flex: 1,
                  backgroundColor: loading ? '#D1D5DB' : '#6366F1',
                  paddingVertical: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Update Record</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

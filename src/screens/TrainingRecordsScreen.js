/**
 * Training Records Screen
 * Company Training Matrices (top) + Individual Training Records (bottom)
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
  approveTrainingRecord,
  updateCompanyTrainingRecordsStatus,
} from '../api/trainingRecords';
import {
  uploadCompanyTrainingMatrix,
  getCompanyTrainingMatrices,
  updateCompanyTrainingMatrix,
  deleteCompanyTrainingMatrix,
  approveCompanyTrainingMatrix,
  updateCompanyTrainingMatricesStatus,
  defaultNameFromFile,
} from '../api/companyTrainingMatrices';
import { getContractorInductionsForCompany } from '../api/inductions';
import { listAllServices } from '../api/services';

export default function TrainingRecordsScreen({
  loggedInCompanyId,
  styles,
  onClose,
  onStatusChanged,
  onMatrixStatusChanged,
}) {
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [trainingMatrices, setTrainingMatrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddMatrixForm, setShowAddMatrixForm] = useState(false);
  const [approvingRecordId, setApprovingRecordId] = useState(null);
  const [approvingMatrixId, setApprovingMatrixId] = useState(null);

  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingMatrixId, setEditingMatrixId] = useState(null);
  const [updateSelectedFile, setUpdateSelectedFile] = useState(null);
  const [updateExpiryDate, setUpdateExpiryDate] = useState('');

  const [inductedContractors, setInductedContractors] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState(null);
  const [selectedContractorName, setSelectedContractorName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [trainingName, setTrainingName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [matrixName, setMatrixName] = useState('');
  const [matrixExpiryDate, setMatrixExpiryDate] = useState('');
  const [matrixFile, setMatrixFile] = useState(null);
  const [selectedMatrixContractorIds, setSelectedMatrixContractorIds] = useState([]);
  const [editMatrixName, setEditMatrixName] = useState('');
  const [editMatrixExpiryDate, setEditMatrixExpiryDate] = useState('');
  const [editMatrixFile, setEditMatrixFile] = useState(null);
  const [editMatrixContractorIds, setEditMatrixContractorIds] = useState([]);

  const [showContractorDropdown, setShowContractorDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  useEffect(() => {
    if (loggedInCompanyId) {
      loadAllData();
    }
  }, [loggedInCompanyId]);

  const notifyStatusChanges = async () => {
    await updateCompanyTrainingRecordsStatus(loggedInCompanyId);
    await updateCompanyTrainingMatricesStatus(loggedInCompanyId);
    if (onStatusChanged) onStatusChanged(loggedInCompanyId);
    if (onMatrixStatusChanged) onMatrixStatusChanged(loggedInCompanyId);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const contractors = await getContractorInductionsForCompany(loggedInCompanyId);
      setInductedContractors(contractors || []);

      const services = await listAllServices();
      setAllServices(services || []);

      const response = await getTrainingRecordsByCompany(loggedInCompanyId);
      if (response.success && response.data) {
        setTrainingRecords(response.data.map(record => ({
          ...record,
          contractor_name: record.contractor?.name || 'Unknown'
        })));
      }

      const matricesResponse = await getCompanyTrainingMatrices(loggedInCompanyId);
      if (matricesResponse.success) {
        setTrainingMatrices(matricesResponse.data || []);
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

  const resetMatrixForm = () => {
    setMatrixName('');
    setMatrixExpiryDate('');
    setMatrixFile(null);
    setSelectedMatrixContractorIds([]);
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

  const handleSelectFile = (setter) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf, image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) setter(file);
    };
    input.click();
  };

  const toggleMatrixContractor = (contractorId, selectedIds, setSelectedIds) => {
    if (selectedIds.includes(contractorId)) {
      setSelectedIds(selectedIds.filter(id => id !== contractorId));
    } else {
      setSelectedIds([...selectedIds, contractorId]);
    }
  };

  const selectAllMatrixContractors = (setSelectedIds) => {
    setSelectedIds(inductedContractors.map(c => c.id));
  };

  const clearMatrixContractors = (setSelectedIds) => {
    setSelectedIds([]);
  };

  const handleAddTrainingRecord = async () => {
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
        selectedServiceId
      );

      if (response?.success) {
        Alert.alert('Success', `Training record added for ${selectedContractorName}`);
        resetForm();
        setShowAddForm(false);
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response?.error);
      }
    } catch (error) {
      Alert.alert('Error', error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMatrix = async () => {
    if (!matrixFile) {
      Alert.alert('Validation', 'Please attach your training matrix file');
      return;
    }
    if (selectedMatrixContractorIds.length === 0) {
      Alert.alert('Validation', 'Please select at least one person covered by this matrix');
      return;
    }

    setLoading(true);
    try {
      const response = await uploadCompanyTrainingMatrix(
        loggedInCompanyId,
        matrixName.trim() || defaultNameFromFile(matrixFile),
        matrixFile,
        selectedMatrixContractorIds,
        matrixExpiryDate ? new Date(parseNZDate(matrixExpiryDate)) : null
      );

      if (response?.success) {
        Alert.alert('Success', response.message || 'Company training matrix added');
        resetMatrixForm();
        setShowAddMatrixForm(false);
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response?.error);
      }
    } catch (error) {
      Alert.alert('Error', error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const record = trainingRecords.find(r => r.id === recordId);
      const response = await deleteTrainingRecord(recordId, record?.file_url);
      if (response?.success) {
        Alert.alert('Success', 'Training record deleted');
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatrix = async (matrix) => {
    if (!window.confirm(`Delete matrix "${matrix.name}"? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const response = await deleteCompanyTrainingMatrix(matrix.id, matrix.file_url);
      if (response?.success) {
        Alert.alert('Success', 'Training matrix deleted');
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!updateSelectedFile && !updateExpiryDate.trim()) {
      Alert.alert('Validation', 'Please select a new file or update the expiry date');
      return;
    }

    setLoading(true);
    try {
      const response = await updateTrainingRecord(
        editingRecordId,
        updateSelectedFile,
        updateExpiryDate ? new Date(parseNZDate(updateExpiryDate)) : null
      );

      if (response?.success) {
        Alert.alert('Success', 'Training record updated');
        setEditingRecordId(null);
        setUpdateSelectedFile(null);
        setUpdateExpiryDate('');
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response?.error);
      }
    } catch (error) {
      Alert.alert('Error', error?.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditMatrix = (matrix) => {
    setEditingMatrixId(matrix.id);
    setEditMatrixName(matrix.name || '');
    setEditMatrixExpiryDate(matrix.expiry_date ? formatDateNZ(matrix.expiry_date) : '');
    setEditMatrixFile(null);
    setEditMatrixContractorIds((matrix.contractors || []).map(c => c.id));
  };

  const handleUpdateMatrix = async () => {
    if (!editMatrixName.trim()) {
      Alert.alert('Validation', 'Please enter a matrix name');
      return;
    }
    if (editMatrixContractorIds.length === 0) {
      Alert.alert('Validation', 'Please select at least one person covered by this matrix');
      return;
    }

    setLoading(true);
    try {
      const response = await updateCompanyTrainingMatrix(editingMatrixId, {
        name: editMatrixName.trim(),
        file: editMatrixFile,
        expiryDate: editMatrixExpiryDate ? new Date(parseNZDate(editMatrixExpiryDate)).toISOString().split('T')[0] : null,
        contractorIds: editMatrixContractorIds,
      });

      if (response?.success) {
        Alert.alert('Success', response.message || 'Training matrix updated');
        setEditingMatrixId(null);
        setEditMatrixFile(null);
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response?.error);
      }
    } catch (error) {
      Alert.alert('Error', error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRecord = async (recordId) => {
    setApprovingRecordId(recordId);
    try {
      const response = await approveTrainingRecord(recordId, 'Admin', '');
      if (response?.success) {
        Alert.alert('Success', 'Training record approved');
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response?.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setApprovingRecordId(null);
    }
  };

  const handleApproveMatrix = async (matrixId) => {
    setApprovingMatrixId(matrixId);
    try {
      const response = await approveCompanyTrainingMatrix(matrixId, 'Admin', '');
      if (response?.success) {
        Alert.alert('Success', 'Training matrix approved');
        await loadAllData();
        await notifyStatusChanges();
      } else {
        Alert.alert('Error', response?.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setApprovingMatrixId(null);
    }
  };

  const renderContractorChecklist = (selectedIds, setSelectedIds) => (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>People Covered *</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => selectAllMatrixContractors(setSelectedIds)}>
            <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600' }}>Select all</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => clearMatrixContractors(setSelectedIds)}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 6,
        backgroundColor: 'white',
        maxHeight: 220,
      }}>
        <ScrollView nestedScrollEnabled>
          {inductedContractors.map(contractor => {
            const selected = selectedIds.includes(contractor.id);
            return (
              <TouchableOpacity
                key={contractor.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  backgroundColor: selected ? '#EFF6FF' : 'white',
                }}
                onPress={() => toggleMatrixContractor(contractor.id, selectedIds, setSelectedIds)}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>{selected ? '☑' : '☐'}</Text>
                <Text style={{ fontSize: 14, color: '#1F2937' }}>{contractor.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
        {selectedIds.length} of {inductedContractors.length} selected
      </Text>
    </View>
  );

  const renderMatrixSection = () => (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12, paddingHorizontal: 16, paddingTop: 16 }}>
        Company Training Matrices
      </Text>
      {trainingMatrices.length === 0 ? (
        <Text style={{ fontSize: 13, color: '#6B7280', paddingHorizontal: 16, marginBottom: 8 }}>
          No company matrices yet. Upload one matrix and select the people it covers.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#EEF2FF',
              borderBottomWidth: 2,
              borderBottomColor: '#C7D2FE',
              paddingVertical: 10,
              paddingHorizontal: 8,
              minWidth: 1100,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 180, paddingRight: 8 }}>Matrix Name</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 120, paddingRight: 8 }}>Expiry Date</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 100, paddingRight: 8 }}>File</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 260, paddingRight: 8 }}>People Covered</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 80, paddingRight: 8 }}>Status</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 240, paddingRight: 8 }}>Actions</Text>
            </View>
            {trainingMatrices.map((matrix, idx) => (
              <View
                key={matrix.id}
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
                <Text style={{ fontSize: 11, color: '#1F2937', width: 180, paddingRight: 8 }}>{matrix.name}</Text>
                <Text style={{ fontSize: 11, color: '#1F2937', width: 120, paddingRight: 8 }}>{formatDateNZ(matrix.expiry_date)}</Text>
                <TouchableOpacity style={{ width: 100, paddingRight: 8 }} onPress={() => window.open(matrix.file_url, '_blank')}>
                  <Text style={{ fontSize: 11, color: '#3B82F6', textDecorationLine: 'underline' }}>
                    {matrix.file_name?.split('/').pop()}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: '#1F2937', width: 260, paddingRight: 8 }}>
                  {(matrix.contractors || []).map(c => c.name).join(', ') || 'None'}
                </Text>
                <Text style={{ fontSize: 11, color: '#1F2937', width: 80, paddingRight: 8 }}>
                  {matrix.status?.charAt(0).toUpperCase() + matrix.status?.slice(1) || 'Pending'}
                </Text>
                <View style={{ width: 240, paddingRight: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {matrix.status === 'pending' && (
                    <TouchableOpacity
                      onPress={() => handleApproveMatrix(matrix.id)}
                      disabled={approvingMatrixId === matrix.id}
                      style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: approvingMatrixId === matrix.id ? '#D1D5DB' : '#10B981', borderRadius: 4 }}
                    >
                      <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>
                        {approvingMatrixId === matrix.id ? '...' : '✓ Approve'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => openEditMatrix(matrix)}
                    style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}
                  >
                    <Text style={{ fontSize: 10, color: '#6366F1', fontWeight: '600' }}>Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteMatrix(matrix)}
                    style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}
                  >
                    <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderIndividualSection = () => (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12, paddingHorizontal: 16 }}>
        Individual Training Records
      </Text>
      {trainingRecords.length === 0 ? (
        <Text style={{ fontSize: 13, color: '#6B7280', paddingHorizontal: 16, marginBottom: 16 }}>
          No individual records yet. Click "+ Individual Record" to add one.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#F3F4F6',
              borderBottomWidth: 2,
              borderBottomColor: '#D1D5DB',
              paddingVertical: 10,
              paddingHorizontal: 8,
              minWidth: 1200,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 150, paddingRight: 8 }}>Contractor</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 180, paddingRight: 8 }}>Training Name</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 120, paddingRight: 8 }}>Expiry Date</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 100, paddingRight: 8 }}>File</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 80, paddingRight: 8 }}>Status</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', width: 240, paddingRight: 8 }}>Actions</Text>
            </View>
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
                  minWidth: 1200,
                }}
              >
                <Text style={{ fontSize: 11, color: '#1F2937', width: 150, paddingRight: 8 }}>{record.contractor_name}</Text>
                <Text style={{ fontSize: 11, color: '#1F2937', width: 180, paddingRight: 8 }}>{record.training_type}</Text>
                <Text style={{ fontSize: 11, color: '#1F2937', width: 120, paddingRight: 8 }}>{formatDateNZ(record.expiry_date)}</Text>
                <TouchableOpacity style={{ width: 100, paddingRight: 8 }} onPress={() => window.open(record.file_url, '_blank')}>
                  <Text style={{ fontSize: 11, color: '#3B82F6', textDecorationLine: 'underline' }}>
                    {record.file_name?.split('/').pop()}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: '#1F2937', width: 80, paddingRight: 8 }}>
                  {record.status?.charAt(0).toUpperCase() + record.status?.slice(1) || 'Pending'}
                </Text>
                <View style={{ width: 240, paddingRight: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {record.status === 'pending' && (
                    <TouchableOpacity
                      onPress={() => handleApproveRecord(record.id)}
                      disabled={approvingRecordId === record.id}
                      style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: approvingRecordId === record.id ? '#D1D5DB' : '#10B981', borderRadius: 4 }}
                    >
                      <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>
                        {approvingRecordId === record.id ? '...' : '✓ Approve'}
                      </Text>
                    </TouchableOpacity>
                  )}
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
      )}
    </View>
  );

  const hasNoContent = trainingMatrices.length === 0 && trainingRecords.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Training Records</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowAddMatrixForm(true)}
            style={{ backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>+ Company Matrix</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAddForm(true)}
            style={{ backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>+ Individual Record</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !showAddForm && !showAddMatrixForm && editingRecordId === null && editingMatrixId === null ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : hasNoContent ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 }}>
            No training records yet.
          </Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
            Upload a company matrix for your team, or add individual training records.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {renderMatrixSection()}
          {renderIndividualSection()}
        </ScrollView>
      )}

      {/* Add Individual Record Modal */}
      <Modal visible={showAddForm} animationType="slide" onRequestClose={() => { setShowAddForm(false); resetForm(); }}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 20 }}>
            <TouchableOpacity onPress={() => { setShowAddForm(false); resetForm(); }}>
              <Text style={{ fontSize: 24, color: '#3B82F6', fontWeight: '600' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>Add Individual Training Record</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Contractor *</Text>
              <TouchableOpacity
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white' }}
                onPress={() => setShowContractorDropdown(!showContractorDropdown)}
              >
                <Text style={{ fontSize: 14, color: selectedContractorId ? '#1F2937' : '#9CA3AF' }}>
                  {selectedContractorName || 'Select a contractor'}
                </Text>
              </TouchableOpacity>
              {showContractorDropdown && (
                <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, marginTop: 4, backgroundColor: 'white', maxHeight: 200 }}>
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

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Service *</Text>
              <TouchableOpacity
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white' }}
                onPress={() => setShowServiceDropdown(!showServiceDropdown)}
              >
                <Text style={{ fontSize: 14, color: selectedServiceId ? '#1F2937' : '#9CA3AF' }}>
                  {selectedServiceName || 'Select a service'}
                </Text>
              </TouchableOpacity>
              {showServiceDropdown && (
                <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, marginTop: 4, backgroundColor: 'white', maxHeight: 200 }}>
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

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Training Name *</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' }}
                placeholder="e.g., OSHA Certification, First Aid"
                value={trainingName}
                onChangeText={setTrainingName}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Expiry Date</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' }}
                placeholder="dd/mm/yyyy"
                value={expiryDate}
                onChangeText={setExpiryDate}
              />
            </View>

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
                onPress={() => handleSelectFile(setSelectedFile)}
              >
                <Text style={{ fontSize: 12, color: selectedFile ? '#10B981' : '#6B7280', marginBottom: 4 }}>
                  {selectedFile ? '✓ ' + selectedFile.name : '📎 Tap to attach file'}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>PDF and image files only</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => { setShowAddForm(false); resetForm(); }} style={{ flex: 1, borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddTrainingRecord} disabled={loading} style={{ flex: 1, backgroundColor: loading ? '#D1D5DB' : '#3B82F6', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Add Record</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Company Matrix Modal */}
      <Modal visible={showAddMatrixForm} animationType="slide" onRequestClose={() => { setShowAddMatrixForm(false); resetMatrixForm(); }}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 20 }}>
            <TouchableOpacity onPress={() => { setShowAddMatrixForm(false); resetMatrixForm(); }}>
              <Text style={{ fontSize: 24, color: '#6366F1', fontWeight: '600' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>Add Company Training Matrix</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
              Upload one matrix document and select all the people it covers.
            </Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Matrix Name</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' }}
                placeholder="Defaults to your file name"
                value={matrixName}
                onChangeText={setMatrixName}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Review / Expiry Date</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' }}
                placeholder="dd/mm/yyyy"
                value={matrixExpiryDate}
                onChangeText={setMatrixExpiryDate}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Matrix Document (PDF or Image) *</Text>
              <TouchableOpacity
                style={{
                  borderWidth: 2,
                  borderColor: matrixFile ? '#10B981' : '#D1D5DB',
                  borderStyle: 'dashed',
                  borderRadius: 6,
                  paddingVertical: 20,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  backgroundColor: matrixFile ? '#F0FDF4' : 'white',
                }}
                onPress={() => handleSelectFile((file) => {
                  setMatrixFile(file);
                  if (!matrixName.trim()) {
                    setMatrixName(defaultNameFromFile(file));
                  }
                })}
              >
                <Text style={{ fontSize: 12, color: matrixFile ? '#10B981' : '#6B7280', marginBottom: 4 }}>
                  {matrixFile ? '✓ ' + matrixFile.name : '📎 Tap to attach matrix'}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>PDF and image files only</Text>
              </TouchableOpacity>
            </View>

            {renderContractorChecklist(selectedMatrixContractorIds, setSelectedMatrixContractorIds)}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => { setShowAddMatrixForm(false); resetMatrixForm(); }} style={{ flex: 1, borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddMatrix} disabled={loading} style={{ flex: 1, backgroundColor: loading ? '#D1D5DB' : '#6366F1', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Add Matrix</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Update Individual Record Modal */}
      <Modal visible={editingRecordId !== null} animationType="slide" onRequestClose={() => { setEditingRecordId(null); setUpdateSelectedFile(null); setUpdateExpiryDate(''); }}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 20 }}>
            <TouchableOpacity onPress={() => { setEditingRecordId(null); setUpdateSelectedFile(null); setUpdateExpiryDate(''); }}>
              <Text style={{ fontSize: 24, color: '#6366F1', fontWeight: '600' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>Update Training Record</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              Upload a new certificate to replace the expired one. The record status will be reset to pending and require re-approval.
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>New Expiry Date (Optional)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' }}
                placeholder="dd/mm/yyyy"
                value={updateExpiryDate}
                onChangeText={setUpdateExpiryDate}
              />
            </View>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>New Certificate (Optional)</Text>
              <TouchableOpacity
                style={{ borderWidth: 2, borderColor: updateSelectedFile ? '#10B981' : '#D1D5DB', borderStyle: 'dashed', borderRadius: 6, paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center', backgroundColor: updateSelectedFile ? '#F0FDF4' : 'white' }}
                onPress={() => handleSelectFile(setUpdateSelectedFile)}
              >
                <Text style={{ fontSize: 12, color: updateSelectedFile ? '#10B981' : '#6B7280', marginBottom: 4 }}>
                  {updateSelectedFile ? '✓ ' + updateSelectedFile.name : '📎 Tap to attach new file'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => { setEditingRecordId(null); setUpdateSelectedFile(null); setUpdateExpiryDate(''); }} style={{ flex: 1, borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateRecord} disabled={loading} style={{ flex: 1, backgroundColor: loading ? '#D1D5DB' : '#6366F1', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Update Record</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Update Company Matrix Modal */}
      <Modal visible={editingMatrixId !== null} animationType="slide" onRequestClose={() => { setEditingMatrixId(null); setEditMatrixFile(null); }}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 20 }}>
            <TouchableOpacity onPress={() => { setEditingMatrixId(null); setEditMatrixFile(null); }}>
              <Text style={{ fontSize: 24, color: '#6366F1', fontWeight: '600' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 12 }}>Update Company Training Matrix</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
              Changing the file or covered people will reset approval to pending.
            </Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Matrix Name *</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' }}
                value={editMatrixName}
                onChangeText={setEditMatrixName}
              />
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Review / Expiry Date</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937' }}
                placeholder="dd/mm/yyyy"
                value={editMatrixExpiryDate}
                onChangeText={setEditMatrixExpiryDate}
              />
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Replace Matrix Document (Optional)</Text>
              <TouchableOpacity
                style={{ borderWidth: 2, borderColor: editMatrixFile ? '#10B981' : '#D1D5DB', borderStyle: 'dashed', borderRadius: 6, paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center', backgroundColor: editMatrixFile ? '#F0FDF4' : 'white' }}
                onPress={() => handleSelectFile(setEditMatrixFile)}
              >
                <Text style={{ fontSize: 12, color: editMatrixFile ? '#10B981' : '#6B7280', marginBottom: 4 }}>
                  {editMatrixFile ? '✓ ' + editMatrixFile.name : '📎 Tap to replace matrix file'}
                </Text>
              </TouchableOpacity>
            </View>
            {renderContractorChecklist(editMatrixContractorIds, setEditMatrixContractorIds)}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => { setEditingMatrixId(null); setEditMatrixFile(null); }} style={{ flex: 1, borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateMatrix} disabled={loading} style={{ flex: 1, backgroundColor: loading ? '#D1D5DB' : '#6366F1', paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}>
                {loading ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Update Matrix</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

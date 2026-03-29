import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import {
  getAllInductions,
  createInduction,
  updateInduction,
  deleteInduction,
} from '../api/inductions';
import {
  uploadInductionPDF,
  deleteInductionPDF,
  getPDFViewerUrl,
} from '../api/inductionsPDF';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';
import { listAllServices } from '../api/services';

/**
 * InductionAdminScreen - Manage inductions (single table, simple form)
 */
export default function InductionAdminScreen({ onBack, styles }) {
  const [inductions, setInductions] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterByBU, setFilterByBU] = useState(null);
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inductionToDelete, setInductionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // PDF handling state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState('');
  
  const [formData, setFormData] = useState({
    id: '',
    induction_name: '',
    description: '',
    subsection_name: '',
    business_unit_ids: [],
    service_id: '',
    force_compulsory_with_service_id: '',
    site_id: '',
    video_url: '',
    video_duration: '',
    pdf_file_name: '',
    pdf_file_url: '',
    is_compulsory: true,
    question_1_text: '',
    question_1_options: ['', '', '', ''],
    question_1_correct_answer: 0,
    question_1_type: 'single-select',
    question_2_text: '',
    question_2_options: ['', '', '', ''],
    question_2_correct_answer: 0,
    question_2_type: 'single-select',
    question_3_text: '',
    question_3_options: ['', '', '', ''],
    question_3_correct_answer: 0,
    question_3_type: 'single-select',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inductionsData, buData, sitesData, servicesData] = await Promise.all([
        getAllInductions(),
        listBusinessUnits(),
        listSites(),
        listAllServices(),
      ]);
      setInductions(Array.isArray(inductionsData) ? inductionsData : []);
      setBusinessUnits(Array.isArray(buData) ? buData : []);
      setSites(Array.isArray(sitesData) ? sitesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load inductions');
    } finally {
      setLoading(false);
      setPdfFile(null);
      setPdfFileName('');
      setShowPDFViewer(false);
    }
  };

  const handleAddInduction = () => {
    setFormData({
      id: '',
      induction_name: '',
      description: '',
      subsection_name: '',
      business_unit_ids: [],
      service_id: '',
      force_compulsory_with_service_id: '',
      site_id: '',
      video_url: '',
      video_duration: '',
      pdf_file_name: '',
      pdf_file_url: '',
      is_compulsory: true,
      question_1_text: '',
      question_1_options: ['', '', '', ''],
      question_1_correct_answer: 0,
      question_1_type: 'single-select',
      question_2_text: '',
      question_2_options: ['', '', '', ''],
      question_2_correct_answer: 0,
      question_2_type: 'single-select',
      question_3_text: '',
      question_3_options: ['', '', '', ''],
      question_3_correct_answer: 0,
      question_3_type: 'single-select',
    });
    setPdfFile(null);
    setPdfFileName('');
    setModalVisible(true);
  };

  const handleEditInduction = (induction) => {
    setFormData({
      id: induction.id,
      induction_name: induction.induction_name,
      description: induction.description || '',
      subsection_name: induction.subsection_name || '',
      business_unit_ids: induction.business_unit_ids || [],
      service_id: induction.service_id || '',
      force_compulsory_with_service_id: induction.force_compulsory_with_service_id || '',
      site_id: induction.site_id || '',
      video_url: induction.video_url || '',
      video_duration: induction.video_duration?.toString() || '',
      pdf_file_name: induction.pdf_file_name || '',
      pdf_file_url: induction.pdf_file_url || '',
      is_compulsory: induction.is_compulsory !== false,
      question_1_text: induction.question_1_text || '',
      question_1_options: induction.question_1_options || ['', '', '', ''],
      question_1_correct_answer: induction.question_1_correct_answer ?? 0,
      question_1_type: induction.question_1_type || 'single-select',
      question_2_text: induction.question_2_text || '',
      question_2_options: induction.question_2_options || ['', '', '', ''],
      question_2_correct_answer: induction.question_2_correct_answer ?? 0,
      question_2_type: induction.question_2_type || 'single-select',
      question_3_text: induction.question_3_text || '',
      question_3_options: induction.question_3_options || ['', '', '', ''],
      question_3_correct_answer: induction.question_3_correct_answer ?? 0,
      question_3_type: induction.question_3_type || 'single-select',
    });
    setPdfFile(null);
    setPdfFileName('');
    setModalVisible(true);
  };

  const handleSaveInduction = async () => {
    if (!formData.induction_name.trim() || formData.business_unit_ids.length === 0) {
      Alert.alert('Error', 'Please fill in induction name and select at least one business unit');
      return;
    }

    try {
      // Normalize correct answers for multi-select questions
      const dataToSave = { ...formData };
      
      // DEBUG: Log what we're about to send
      console.log('📝 FormData service_id before save:', formData.service_id);
      console.log('📝 Services available:', services.map(s => ({ id: s.id, name: s.name })));
      console.log('📝 DataToSave service_id:', dataToSave.service_id);
      
      for (let i = 1; i <= 3; i++) {
        const qType = `question_${i}_type`;
        const qCorrect = `question_${i}_correct_answer`;
        
        // For multi-select questions, ensure correct answer is an array
        if (dataToSave[qType] === 'multi-select') {
          if (typeof dataToSave[qCorrect] === 'number') {
            // Convert single number to array
            dataToSave[qCorrect] = [dataToSave[qCorrect]];
          } else if (!Array.isArray(dataToSave[qCorrect])) {
            // Initialize as empty array if it's something else
            dataToSave[qCorrect] = [];
          }
        } else {
          // For single-select, ensure it's a number
          if (Array.isArray(dataToSave[qCorrect])) {
            // Take first element if it's an array
            dataToSave[qCorrect] = dataToSave[qCorrect][0] ?? 0;
          } else if (typeof dataToSave[qCorrect] !== 'number') {
            dataToSave[qCorrect] = 0;
          }
        }
      }
      
      if (dataToSave.id) {
        await updateInduction(dataToSave.id, dataToSave);
      } else {
        await createInduction(dataToSave);
      }
      setModalVisible(false);
      loadData();
      Alert.alert('Success', dataToSave.id ? 'Induction updated' : 'Induction created');
    } catch (err) {
      console.error('❌ Full error object:', err);
      Alert.alert('Error', 'Failed to save induction');
    }
  };

  const handleDeleteInduction = (induction) => {
    console.log('🗑️ Delete requested for induction:', { id: induction.id, name: induction.induction_name });
    setInductionToDelete(induction);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteInduction = async () => {
    if (!inductionToDelete) return;
    
    try {
      console.log('🗑️ Starting delete process for ID:', inductionToDelete.id);
      setIsDeleting(true);
      const result = await deleteInduction(inductionToDelete.id);
      console.log('🗑️ Delete API returned:', result);
      await loadData();
      console.log('✅ Delete successful and data reloaded');
      setShowDeleteConfirm(false);
      setInductionToDelete(null);
      Alert.alert('Success', 'Induction deleted');
    } catch (err) {
      console.error('❌ Delete error:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Full error:', JSON.stringify(err));
      Alert.alert('Error', 'Failed to delete induction: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        // Check file size (max 10MB)
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('Error', 'PDF file must be smaller than 10MB');
          return;
        }
        setPdfFile(file);
        setPdfFileName(file.name);
      }
    } catch (err) {
      console.error('Error picking PDF:', err);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const handleUploadPDF = async () => {
    if (!pdfFile || !formData.id) {
      Alert.alert('Error', 'Please save the induction first before uploading PDF');
      return;
    }

    try {
      setUploadingPDF(true);
      const { success, data, message } = await uploadInductionPDF(formData.id, pdfFile);
      
      if (success) {
        // Update formData with PDF filename
        setFormData({ ...formData, pdf_file_name: data.pdf_file_name });
        setPdfFile(null);
        setPdfFileName('');
        await loadData(); // Refresh to show PDF indicator
        Alert.alert('Success', 'PDF uploaded successfully');
      } else {
        Alert.alert('Error', message || 'Failed to upload PDF');
      }
    } catch (err) {
      console.error('PDF upload error:', err);
      Alert.alert('Error', 'Failed to upload PDF: ' + err.message);
    } finally {
      setUploadingPDF(false);
    }
  };

  const handleDeletePDF = async () => {
    if (!formData.id) return;
    
    Alert.alert('Delete PDF', 'Remove this PDF?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const { success, message } = await deleteInductionPDF(formData.id);
            if (success) {
              setFormData({ ...formData, pdf_file_name: '', pdf_file_url: '' });
              await loadData();
              Alert.alert('Success', 'PDF deleted');
            } else {
              Alert.alert('Error', message || 'Failed to delete PDF');
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete PDF');
          }
        },
        style: 'destructive'
      }
    ]);
  };

  const handleViewPDF = () => {
    if (formData.pdf_file_url) {
      const viewerUrl = getPDFViewerUrl(formData.pdf_file_url);
      setPdfViewerUrl(viewerUrl);
      setShowPDFViewer(true);
    }
  };

  const toggleBusinessUnit = (buId) => {
    const currentIds = Array.isArray(formData.business_unit_ids) ? formData.business_unit_ids : [];
    const updatedIds = currentIds.includes(buId)
      ? currentIds.filter(id => id !== buId)
      : [...currentIds, buId];
    setFormData({ ...formData, business_unit_ids: updatedIds });
  };

  const toggleService = (serviceId) => {
    // Single-select: only one service per induction
    setFormData({ ...formData, service_id: formData.service_id === serviceId ? '' : serviceId });
  };

  const isServiceSelected = (serviceId) => formData.service_id === serviceId;
  const getSelectedBUIds = () => Array.isArray(formData.business_unit_ids) ? formData.business_unit_ids : [];
  const isBUSelected = (buId) => Array.isArray(formData.business_unit_ids) && formData.business_unit_ids.includes(buId);

  const filteredInductions = filterByBU
    ? inductions.filter(ind => Array.isArray(ind.business_unit_ids) && ind.business_unit_ids.includes(filterByBU))
    : inductions;

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Manage Inductions</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F3F4F6' }}>
        <TouchableOpacity style={{ backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 }} onPress={handleAddInduction}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>+ Add Induction</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>FILTER</Text>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => setFilterByBU(null)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: !filterByBU ? '#3B82F6' : '#E5E7EB' }}>
            <Text style={{ color: !filterByBU ? 'white' : '#374151', fontWeight: '600', fontSize: 12 }}>All</Text>
          </TouchableOpacity>
          {businessUnits.map(bu => (
            <TouchableOpacity key={bu.id} onPress={() => setFilterByBU(bu.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: filterByBU === bu.id ? '#3B82F6' : '#E5E7EB' }}>
              <Text style={{ color: filterByBU === bu.id ? 'white' : '#374151', fontWeight: '600', fontSize: 12 }}>{bu.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {filteredInductions.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>No inductions</Text>
        ) : (
          filteredInductions.map(ind => (
            <View key={ind.id} style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 }}>{ind.induction_name}</Text>
                {ind.is_compulsory && <Text style={{ fontSize: 11, fontWeight: '700', color: 'white', backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>REQUIRED</Text>}
              </View>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Applies to: {ind.business_unit_ids?.length > 0 ? businessUnits.filter(bu => ind.business_unit_ids.includes(bu.id)).map(bu => bu.name).join(', ') : 'None'}</Text>
              {ind.service_id && <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Service: {services.find(s => s.id === ind.service_id)?.name}</Text>}
              {ind.video_url && <Text style={{ fontSize: 11, color: '#0EA5E9', marginTop: 8 }}>📹 {ind.video_duration ? `${ind.video_duration} min` : 'Video'}</Text>}
              {ind.pdf_file_name && <Text style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>📑 {ind.pdf_file_name}</Text>}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity onPress={() => handleEditInduction(ind)} style={{ flex: 1, backgroundColor: '#E0E7FF', padding: 10, borderRadius: 6, alignItems: 'center' }}><Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteInduction(ind)} style={{ flex: 1, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 6, alignItems: 'center' }}><Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.backButton}>←</Text></TouchableOpacity>
            <Text style={styles.title}>{formData.id ? 'Edit' : 'New'} Induction</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={[styles.label, { marginTop: 0 }]}>Induction Name *</Text>
            <TextInput style={styles.input} placeholder="E.g., Working at Heights" value={formData.induction_name} onChangeText={(text) => setFormData({ ...formData, induction_name: text })} />
            
            <Text style={[styles.label, { marginTop: 12 }]}>Variant Name</Text>
            <TextInput style={styles.input} placeholder="E.g., MEWP, Ladder" value={formData.subsection_name} onChangeText={(text) => setFormData({ ...formData, subsection_name: text })} />
            
            <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
            <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Brief description" value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} multiline />

            <Text style={[styles.label, { marginTop: 20 }]}>Business Units * (select one or more)</Text>
            {businessUnits.map(bu => (
              <TouchableOpacity key={bu.id} onPress={() => toggleBusinessUnit(bu.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: isBUSelected(bu.id) ? '#E0E7FF' : '#F3F4F6', borderRadius: 6, marginBottom: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', backgroundColor: isBUSelected(bu.id) ? '#3B82F6' : 'white', marginRight: 10 }}>{isBUSelected(bu.id) && <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>✓</Text>}</View>
                <Text style={{ fontSize: 14, fontWeight: isBUSelected(bu.id) ? '600' : '400' }}>{bu.name}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 16 }]}>Services (optional)</Text>
            {services.length > 0 ? (
              services.map(service => (
                <TouchableOpacity key={service.id} onPress={() => toggleService(service.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: isServiceSelected(service.id) ? '#DBEAFE' : '#F3F4F6', borderRadius: 6, marginBottom: 8 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center', backgroundColor: isServiceSelected(service.id) ? '#0EA5E9' : 'white', marginRight: 10 }}>{isServiceSelected(service.id) && <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>✓</Text>}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: isServiceSelected(service.id) ? '600' : '400' }}>{service.name}</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Linked to {businessUnits.find(bu => bu.id === service.business_unit_id)?.name}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' }}>No services available</Text>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Force Compulsory When Service Selected (optional)</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>Select a service that, if assigned to a contractor, will make this induction compulsory</Text>
            <TouchableOpacity onPress={() => setFormData({ ...formData, force_compulsory_with_service_id: '' })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: formData.force_compulsory_with_service_id === '' ? '#F3E8FF' : '#F3F4F6', marginBottom: 8 }}><Text style={{ color: formData.force_compulsory_with_service_id === '' ? '#7C3AED' : '#6B7280', fontWeight: '600' }}>None (optional induction)</Text></TouchableOpacity>
            {services.map(service => (
              <TouchableOpacity key={`force_${service.id}`} onPress={() => setFormData({ ...formData, force_compulsory_with_service_id: formData.force_compulsory_with_service_id === service.id ? '' : service.id })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: formData.force_compulsory_with_service_id === service.id ? '#FEE2E2' : '#F3F4F6', marginBottom: 6 }}><Text style={{ color: formData.force_compulsory_with_service_id === service.id ? '#DC2626' : '#6B7280' }}>{service.name}</Text></TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 16 }]}>Site-Specific (optional)</Text>
            <TouchableOpacity onPress={() => setFormData({ ...formData, site_id: '' })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: formData.site_id === '' ? '#10B981' : '#E5E7EB', marginBottom: 8 }}><Text style={{ color: formData.site_id === '' ? 'white' : '#374151', fontWeight: '600' }}>✓ All Sites</Text></TouchableOpacity>
            {sites.filter(site => getSelectedBUIds().includes(site.business_unit_id)).map(site => (
              <TouchableOpacity key={site.id} onPress={() => setFormData({ ...formData, site_id: site.id })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: formData.site_id === site.id ? '#10B981' : '#E5E7EB', marginBottom: 6 }}><Text style={{ color: formData.site_id === site.id ? 'white' : '#374151' }}>{site.name}</Text></TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 12 }]}>YouTube Video URL</Text>
            <TextInput style={styles.input} placeholder="https://youtube.com/watch?v=..." value={formData.video_url} onChangeText={(text) => setFormData({ ...formData, video_url: text })} />
            
            <Text style={[styles.label, { marginTop: 12 }]}>Duration (minutes)</Text>
            <TextInput style={styles.input} placeholder="5" keyboardType="number-pad" value={formData.video_duration} onChangeText={(text) => setFormData({ ...formData, video_duration: text })} />

            <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>PDF Presentation (Alternative to Video)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TouchableOpacity 
                onPress={handlePickPDF} 
                disabled={uploadingPDF || !formData.id}
                style={{ flex: 1, marginRight: 8 }}
              >
                <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, backgroundColor: formData.id ? '#3B82F6' : '#D1D5DB', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                    {pdfFileName ? '📄 ' + pdfFileName.substring(0, 20) : uploadingPDF ? 'Uploading...' : 'Choose PDF'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {pdfFile && (
                <TouchableOpacity 
                  onPress={handleUploadPDF} 
                  disabled={uploadingPDF}
                  style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#10B981', borderRadius: 6 }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>

            {formData.pdf_file_name && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#DBEAFE', borderRadius: 6, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#0369A1' }}>📑 {formData.pdf_file_name}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={handleViewPDF} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0369A1', borderRadius: 4 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeletePDF} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EF4444', borderRadius: 4 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {[1, 2, 3].map(qNum => {
              const qText = `question_${qNum}_text`;
              const qOptions = `question_${qNum}_options`;
              const qCorrect = `question_${qNum}_correct_answer`;
              const qType = `question_${qNum}_type`;
              const hasQ = formData[qText]?.trim();
              return (
                <View key={qNum} style={{ marginTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#3B82F6', marginBottom: 12 }}>Q{qNum} {!hasQ && '(optional)'}</Text>
                  <Text style={[styles.label, { marginTop: 0 }]}>Question Text</Text>
                  <TextInput style={[styles.input, { minHeight: 50 }]} placeholder={`Leave blank to skip`} value={formData[qText]} onChangeText={(text) => setFormData({ ...formData, [qText]: text })} multiline />
                  {hasQ && (
                    <>
                      <Text style={[styles.label, { marginTop: 12 }]}>Answer Type</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <TouchableOpacity
                          onPress={() => setFormData({ ...formData, [qType]: 'single-select' })}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            backgroundColor: formData[qType] === 'single-select' ? '#3B82F6' : '#E5E7EB',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: formData[qType] === 'single-select' ? 'white' : '#374151', fontWeight: '600', fontSize: 13 }}>
                            ◯ Single Select
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setFormData({ ...formData, [qType]: 'multi-select' })}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 6,
                            backgroundColor: formData[qType] === 'multi-select' ? '#3B82F6' : '#E5E7EB',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: formData[qType] === 'multi-select' ? 'white' : '#374151', fontWeight: '600', fontSize: 13 }}>
                            ☑ Multi Select
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.label, { marginTop: 12 }]}>Answer Options</Text>
                      {formData[qOptions].map((opt, idx) => {
                        const isSingleSelect = formData[qType] === 'single-select';
                        const isCorrect = isSingleSelect 
                          ? formData[qCorrect] === idx 
                          : Array.isArray(formData[qCorrect]) && formData[qCorrect].includes(idx);
                        
                        const handleToggleCorrect = () => {
                          if (isSingleSelect) {
                            // Single-select: can only have one correct answer
                            setFormData({ ...formData, [qCorrect]: idx });
                          } else {
                            // Multi-select: can have multiple correct answers
                            const currentCorrect = Array.isArray(formData[qCorrect]) ? formData[qCorrect] : [];
                            if (currentCorrect.includes(idx)) {
                              // Remove this answer from correct list
                              setFormData({ ...formData, [qCorrect]: currentCorrect.filter(i => i !== idx) });
                            } else {
                              // Add this answer to correct list
                              setFormData({ ...formData, [qCorrect]: [...currentCorrect, idx] });
                            }
                          }
                        };
                        
                        return (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Text style={{ fontWeight: '600', color: '#6B7280', width: 28 }}>{String.fromCharCode(65 + idx)})</Text>
                            <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} placeholder={`Option ${idx + 1}`} value={opt} onChangeText={(text) => { const newOpts = [...formData[qOptions]]; newOpts[idx] = text; setFormData({ ...formData, [qOptions]: newOpts }); }} />
                            <TouchableOpacity onPress={handleToggleCorrect} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: isCorrect ? '#10B981' : '#E5E7EB' }}>
                              <Text style={{ color: isCorrect ? 'white' : '#6B7280', fontWeight: '600' }}>✓</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </>
                  )}
                </View>
              );
            })}

            <TouchableOpacity onPress={() => setFormData({ ...formData, is_compulsory: !formData.is_compulsory })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: formData.is_compulsory ? '#FEE2E2' : '#F3F4F6', borderRadius: 6, marginTop: 20, marginBottom: 20 }}>
              <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#DC2626', alignItems: 'center', justifyContent: 'center', backgroundColor: formData.is_compulsory ? '#DC2626' : 'white', marginRight: 12 }}>{formData.is_compulsory && <Text style={{ color: 'white', fontWeight: '700' }}>✓</Text>}</View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: formData.is_compulsory ? '#DC2626' : '#6B7280' }}>Compulsory</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ backgroundColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16 }} onPress={handleSaveInduction}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{formData.id ? 'Update' : 'Create'} Induction</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* PDF Viewer Modal */}
      <Modal visible={showPDFViewer} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowPDFViewer(false)}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>View PDF</Text>
          </View>
          {pdfViewerUrl ? (
            Platform.OS === 'web' ? (
              <iframe
                src={pdfViewerUrl}
                style={{
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title="PDF Viewer"
              />
            ) : (
              <WebView 
                source={{ uri: pdfViewerUrl }} 
                style={{ flex: 1 }}
                startInLoadingState
                renderLoading={() => <ActivityIndicator style={{ flex: 1 }} size="large" />}
              />
            )
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#666' }}>Loading PDF...</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Delete Induction?</Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              Are you sure you want to delete "{inductionToDelete?.induction_name}"? This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#E5E7EB', alignItems: 'center' }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteInduction}
                disabled={isDeleting}
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#DC2626', alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

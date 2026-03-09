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
} from 'react-native';
import {
  getAllInductions,
  createInduction,
  updateInduction,
  deleteInduction,
} from '../api/inductions';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';

/**
 * InductionAdminScreen - Manage inductions (single table, simple form)
 */
export default function InductionAdminScreen({ onBack, styles }) {
  const [inductions, setInductions] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterByBU, setFilterByBU] = useState(null);
  
  const [formData, setFormData] = useState({
    id: '',
    induction_name: '',
    description: '',
    subsection_name: '',
    business_unit_ids: [],
    site_id: '',
    video_url: '',
    video_duration: '',
    is_compulsory: true,
    question_1_text: '',
    question_1_options: ['', '', '', ''],
    question_1_correct_answer: 0,
    question_2_text: '',
    question_2_options: ['', '', '', ''],
    question_2_correct_answer: 0,
    question_3_text: '',
    question_3_options: ['', '', '', ''],
    question_3_correct_answer: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inductionsData, buData, sitesData] = await Promise.all([
        getAllInductions(),
        listBusinessUnits(),
        listSites(),
      ]);
      setInductions(Array.isArray(inductionsData) ? inductionsData : []);
      setBusinessUnits(Array.isArray(buData) ? buData : []);
      setSites(Array.isArray(sitesData) ? sitesData : []);
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load inductions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInduction = () => {
    setFormData({
      id: '',
      induction_name: '',
      description: '',
      subsection_name: '',
      business_unit_ids: [],
      site_id: '',
      video_url: '',
      video_duration: '',
      is_compulsory: true,
      question_1_text: '',
      question_1_options: ['', '', '', ''],
      question_1_correct_answer: 0,
      question_2_text: '',
      question_2_options: ['', '', '', ''],
      question_2_correct_answer: 0,
      question_3_text: '',
      question_3_options: ['', '', '', ''],
      question_3_correct_answer: 0,
    });
    setModalVisible(true);
  };

  const handleEditInduction = (induction) => {
    setFormData({
      id: induction.id,
      induction_name: induction.induction_name,
      description: induction.description || '',
      subsection_name: induction.subsection_name || '',
      business_unit_ids: induction.business_unit_ids || [],
      site_id: induction.site_id || '',
      video_url: induction.video_url || '',
      video_duration: induction.video_duration?.toString() || '',
      is_compulsory: induction.is_compulsory !== false,
      question_1_text: induction.question_1_text || '',
      question_1_options: induction.question_1_options || ['', '', '', ''],
      question_1_correct_answer: induction.question_1_correct_answer ?? 0,
      question_2_text: induction.question_2_text || '',
      question_2_options: induction.question_2_options || ['', '', '', ''],
      question_2_correct_answer: induction.question_2_correct_answer ?? 0,
      question_3_text: induction.question_3_text || '',
      question_3_options: induction.question_3_options || ['', '', '', ''],
      question_3_correct_answer: induction.question_3_correct_answer ?? 0,
    });
    setModalVisible(true);
  };

  const handleSaveInduction = async () => {
    if (!formData.induction_name.trim() || formData.business_unit_ids.length === 0) {
      Alert.alert('Error', 'Please fill in induction name and select at least one business unit');
      return;
    }

    try {
      if (formData.id) {
        await updateInduction(formData.id, formData);
      } else {
        await createInduction(formData);
      }
      setModalVisible(false);
      loadData();
      Alert.alert('Success', formData.id ? 'Induction updated' : 'Induction created');
    } catch (err) {
      Alert.alert('Error', 'Failed to save induction');
    }
  };

  const handleDeleteInduction = (induction) => {
    Alert.alert(
      'Delete Induction',
      `Delete "${induction.induction_name}"?`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteInduction(induction.id);
              await loadData();
              Alert.alert('Success', 'Induction deleted');
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete induction: ' + err.message);
              setLoading(false);
            }
          },
          style: 'destructive'
        },
      ]
    );
  };

  const toggleBusinessUnit = (buId) => {
    const updatedIds = formData.business_unit_ids.includes(buId)
      ? formData.business_unit_ids.filter(id => id !== buId)
      : [...formData.business_unit_ids, buId];
    setFormData({ ...formData, business_unit_ids: updatedIds });
  };

  const filteredInductions = filterByBU
    ? inductions.filter(ind => Array.isArray(ind.business_unit_ids) && ind.business_unit_ids.includes(filterByBU))
    : inductions;

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>← Back</Text></TouchableOpacity>
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
              {ind.video_url && <Text style={{ fontSize: 11, color: '#0EA5E9', marginTop: 8 }}>📹 {ind.video_duration ? `${ind.video_duration} min` : 'Video'}</Text>}
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
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.backButton}>← Back</Text></TouchableOpacity>
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
              <TouchableOpacity key={bu.id} onPress={() => toggleBusinessUnit(bu.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: formData.business_unit_ids.includes(bu.id) ? '#E0E7FF' : '#F3F4F6', borderRadius: 6, marginBottom: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', backgroundColor: formData.business_unit_ids.includes(bu.id) ? '#3B82F6' : 'white', marginRight: 10 }}>{formData.business_unit_ids.includes(bu.id) && <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>✓</Text>}</View>
                <Text style={{ fontSize: 14, fontWeight: formData.business_unit_ids.includes(bu.id) ? '600' : '400' }}>{bu.name}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 16 }]}>Site-Specific (optional)</Text>
            <TouchableOpacity onPress={() => setFormData({ ...formData, site_id: '' })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: formData.site_id === '' ? '#10B981' : '#E5E7EB', marginBottom: 8 }}><Text style={{ color: formData.site_id === '' ? 'white' : '#374151', fontWeight: '600' }}>✓ All Sites</Text></TouchableOpacity>
            {sites.filter(site => formData.business_unit_ids.includes(site.business_unit_id)).map(site => (
              <TouchableOpacity key={site.id} onPress={() => setFormData({ ...formData, site_id: site.id })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: formData.site_id === site.id ? '#10B981' : '#E5E7EB', marginBottom: 6 }}><Text style={{ color: formData.site_id === site.id ? 'white' : '#374151' }}>{site.name}</Text></TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 12 }]}>YouTube Video URL</Text>
            <TextInput style={styles.input} placeholder="https://youtube.com/watch?v=..." value={formData.video_url} onChangeText={(text) => setFormData({ ...formData, video_url: text })} />
            
            <Text style={[styles.label, { marginTop: 12 }]}>Duration (minutes)</Text>
            <TextInput style={styles.input} placeholder="5" keyboardType="number-pad" value={formData.video_duration} onChangeText={(text) => setFormData({ ...formData, video_duration: text })} />

            {[1, 2, 3].map(qNum => {
              const qText = `question_${qNum}_text`;
              const qOptions = `question_${qNum}_options`;
              const qCorrect = `question_${qNum}_correct_answer`;
              const hasQ = formData[qText]?.trim();
              return (
                <View key={qNum} style={{ marginTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#3B82F6', marginBottom: 12 }}>Q{qNum} {!hasQ && '(optional)'}</Text>
                  <Text style={[styles.label, { marginTop: 0 }]}>Question Text</Text>
                  <TextInput style={[styles.input, { minHeight: 50 }]} placeholder={`Leave blank to skip`} value={formData[qText]} onChangeText={(text) => setFormData({ ...formData, [qText]: text })} multiline />
                  {hasQ && (
                    <>
                      <Text style={[styles.label, { marginTop: 12 }]}>Answer Options</Text>
                      {formData[qOptions].map((opt, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <Text style={{ fontWeight: '600', color: '#6B7280', width: 28 }}>{String.fromCharCode(65 + idx)})</Text>
                          <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} placeholder={`Option ${idx + 1}`} value={opt} onChangeText={(text) => { const newOpts = [...formData[qOptions]]; newOpts[idx] = text; setFormData({ ...formData, [qOptions]: newOpts }); }} />
                          <TouchableOpacity onPress={() => setFormData({ ...formData, [qCorrect]: idx })} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: formData[qCorrect] === idx ? '#10B981' : '#E5E7EB' }}><Text style={{ color: formData[qCorrect] === idx ? 'white' : '#6B7280', fontWeight: '600' }}>✓</Text></TouchableOpacity>
                        </View>
                      ))}
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
    </View>
  );
}

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
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  getInductionSections,
  createInductionSection,
  updateInductionSection,
  deleteInductionSection,
  getInductionSubsections,
  createInductionSubsection,
  updateInductionSubsection,
  deleteInductionSubsection,
  getInductionQuestions,
  createInductionQuestion,
  updateInductionQuestion,
  deleteInductionQuestion,
} from '../api/inductions';
import { listAllServices } from '../api/services';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';

/**
 * InductionAdminScreen - Manage induction sections, subsections, and questions
 */
export default function InductionAdminScreen({ onBack, styles }) {
  const [currentView, setCurrentView] = useState('sections'); // 'sections', 'subsections', 'questions'
  const [sections, setSections] = useState([]);
  const [services, setServices] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubsection, setSelectedSubsection] = useState(null);
  const [subsections, setSubsections] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    business_unit_id: '',
    site_id: '', // Empty string means 'All Sites'
    induction_name: '',
    description: '',
    service_id: '',
    video_url: '',
    duration_minutes: '',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer_index: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sectionsData, servicesData, buData, sitesData] = await Promise.all([
        getInductionSections(),
        listAllServices(),
        listBusinessUnits(),
        listSites(),
      ]);
      setSections(sectionsData || []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setBusinessUnits(Array.isArray(buData) ? buData : []);
      setSites(Array.isArray(sitesData) ? sitesData : []);
    } catch (err) {
      console.error('Error loading induction data:', err);
      Alert.alert('Error', 'Failed to load inductions');
    } finally {
      setLoading(false);
    }
  };

  const loadSubsections = async (sectionId) => {
    try {
      const data = await getInductionSubsections(sectionId);
      setSubsections(data || []);
    } catch (err) {
      console.error('Error loading subsections:', err);
    }
  };

  const loadQuestions = async (subsectionId) => {
    try {
      const data = await getInductionQuestions(subsectionId);
      setQuestions(data || []);
    } catch (err) {
      console.error('Error loading questions:', err);
    }
  };

  const handleAddSection = () => {
    setFormData({
      id: '',
      business_unit_id: '',
      site_id: '',
      induction_name: '',
      description: '',
      service_id: '',
    });
    setModalVisible(true);
  };

  const handleEditSection = (section) => {
    setFormData({
      id: section.id,
      business_unit_id: section.business_unit_id || '',
      site_id: section.site_id || '',
      induction_name: section.induction_name,
      description: section.description,
      service_id: section.service_id,
    });
    setModalVisible(true);
  };

  const handleSaveSection = async () => {
    if (!formData.induction_name.trim() || !formData.service_id || !formData.business_unit_id) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Business Unit, Service)');
      return;
    }

    try {
      if (formData.id) {
        await updateInductionSection(formData.id, formData);
      } else {
        await createInductionSection(formData);
      }
      setModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save induction section');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    Alert.alert('Delete Section', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteInductionSection(sectionId);
            loadData();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete section');
          }
        },
      },
    ]);
  };

  const handleAddSubsection = () => {
    setFormData({
      id: '',
      subsection_name: '',
      video_url: '',
      duration_minutes: '',
    });
    setModalVisible(true);
  };

  const handleEditSubsection = (sub) => {
    setFormData({
      id: sub.id,
      subsection_name: sub.subsection_name,
      video_url: sub.video_url,
      duration_minutes: sub.video_duration?.toString() || '',
    });
    setModalVisible(true);
  };

  const handleSaveSubsection = async () => {
    if (!formData.subsection_name.trim() || !formData.video_url.trim()) {
      Alert.alert('Error', 'Please fill in subsection name and video URL');
      return;
    }

    try {
      if (formData.id) {
        await updateInductionSubsection(formData.id, {
          subsection_name: formData.subsection_name,
          video_url: formData.video_url,
          video_duration: parseInt(formData.duration_minutes) || 0,
        });
      } else {
        await createInductionSubsection(selectedSection.id, {
          subsection_name: formData.subsection_name,
          video_url: formData.video_url,
          video_duration: parseInt(formData.duration_minutes) || 0,
        });
      }
      setModalVisible(false);
      loadSubsections(selectedSection.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to save subsection');
    }
  };

  const handleDeleteSubsection = async (subsectionId) => {
    Alert.alert('Delete Subsection', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteInductionSubsection(subsectionId);
            loadSubsections(selectedSection.id);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete subsection');
          }
        },
      },
    ]);
  };

  const handleAddQuestion = () => {
    setFormData({
      id: '',
      question_text: '',
      options: ['', '', '', ''],
      correct_answer_index: 0,
    });
    setModalVisible(true);
  };

  const handleEditQuestion = (question) => {
    setFormData({
      id: question.id,
      question_text: question.question_text,
      options: question.answer_options || ['', '', '', ''],
      correct_answer_index: question.correct_answer_index || 0,
    });
    setModalVisible(true);
  };

  const handleSaveQuestion = async () => {
    if (!formData.question_text.trim() || formData.options.some(o => !o.trim())) {
      Alert.alert('Error', 'Please fill in question and all answer options');
      return;
    }

    try {
      if (formData.id) {
        await updateInductionQuestion(formData.id, {
          question_text: formData.question_text,
          answer_options: formData.options,
          correct_answer_index: formData.correct_answer_index,
        });
      } else {
        await createInductionQuestion(selectedSubsection.id, {
          question_text: formData.question_text,
          answer_options: formData.options,
          correct_answer_index: formData.correct_answer_index,
        });
      }
      setModalVisible(false);
      loadQuestions(selectedSubsection.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    Alert.alert('Delete Question', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteInductionQuestion(questionId);
            loadQuestions(selectedSubsection.id);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete question');
          }
        },
      },
    ]);
  };

  // Sections View
  if (currentView === 'sections' && !loading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Inductions</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              padding: 14,
              borderRadius: 8,
              marginBottom: 16,
              alignItems: 'center',
            }}
            onPress={handleAddSection}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              + Add Induction Section
            </Text>
          </TouchableOpacity>

          {sections.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>
              No induction sections yet
            </Text>
          ) : (
            sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={{
                  backgroundColor: 'white',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: '#3B82F6',
                }}
                onPress={() => {
                  setSelectedSection(section);
                  loadSubsections(section.id);
                  setCurrentView('subsections');
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                  {section.induction_name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                  {section.description || 'No description'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleEditSection(section)}
                    style={{
                      flex: 1,
                      backgroundColor: '#E0E7FF',
                      padding: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSection(section.id)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FEE2E2',
                      padding: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Modal for adding/editing sections */}
        <Modal visible={modalVisible} animationType="slide">
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>
                {formData.id ? 'Edit Induction' : 'New Induction'}
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.label}>Induction Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Working at Heights"
                value={formData.induction_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, induction_name: text })
                }
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Brief description of the induction"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Business Unit *</Text>
              <ScrollView
                horizontal
                contentContainerStyle={{ gap: 8, marginBottom: 20 }}
              >
                {businessUnits.map((bu) => (
                  <TouchableOpacity
                    key={bu.id}
                    onPress={() => setFormData({ ...formData, business_unit_id: bu.id })}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor:
                        formData.business_unit_id === bu.id ? '#8B5CF6' : '#E5E7EB',
                    }}
                  >
                    <Text
                      style={{
                        color: formData.business_unit_id === bu.id ? 'white' : '#374151',
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                    >
                      {bu.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { marginTop: 16 }]}>Applies To *</Text>
              <ScrollView
                horizontal
                contentContainerStyle={{ gap: 8, marginBottom: 20 }}
              >
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, site_id: '' })}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor:
                      formData.site_id === '' ? '#10B981' : '#E5E7EB',
                  }}
                >
                  <Text
                    style={{
                      color: formData.site_id === '' ? 'white' : '#374151',
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    All Sites
                  </Text>
                </TouchableOpacity>
                {sites.map((site) => (
                  <TouchableOpacity
                    key={site.id}
                    onPress={() => setFormData({ ...formData, site_id: site.id })}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor:
                        formData.site_id === site.id ? '#10B981' : '#E5E7EB',
                    }}
                  >
                    <Text
                      style={{
                        color: formData.site_id === site.id ? 'white' : '#374151',
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                    >
                      {site.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { marginTop: 16 }]}>Service *</Text>
              <ScrollView
                horizontal
                contentContainerStyle={{ gap: 8, marginBottom: 20 }}
              >
                {services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => setFormData({ ...formData, service_id: service.id })}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor:
                        formData.service_id === service.id ? '#3B82F6' : '#E5E7EB',
                    }}
                  >
                    <Text
                      style={{
                        color: formData.service_id === service.id ? 'white' : '#374151',
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                    >
                      {service.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
                onPress={handleSaveSection}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  {formData.id ? 'Update' : 'Create'} Induction
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  // Subsections View
  if (currentView === 'subsections' && selectedSection) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('sections')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selectedSection.induction_name}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              padding: 14,
              borderRadius: 8,
              marginBottom: 16,
              alignItems: 'center',
            }}
            onPress={handleAddSubsection}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              + Add Variant/Subsection
            </Text>
          </TouchableOpacity>

          {subsections.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>
              No subsections yet. Add one to get started!
            </Text>
          ) : (
            subsections.map((sub) => (
              <View
                key={sub.id}
                style={{
                  backgroundColor: 'white',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: '#8B5CF6',
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSubsection(sub);
                    loadQuestions(sub.id);
                    setCurrentView('questions');
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                    {sub.subsection_name}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                    Video: {sub.video_duration || 0} min
                  </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleEditSubsection(sub)}
                    style={{
                      flex: 1,
                      backgroundColor: '#E0E7FF',
                      padding: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSubsection(sub.id)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FEE2E2',
                      padding: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Modal for adding/editing subsections */}
        <Modal visible={modalVisible && currentView === 'subsections'} animationType="slide">
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>
                {formData.id ? 'Edit Variant' : 'New Variant'}
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.label}>Variant Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., MEWP, Telehandler, Ladder"
                value={formData.subsection_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, subsection_name: text })
                }
              />

              <Text style={[styles.label, { marginTop: 16 }]}>YouTube Video URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://youtube.com/watch?v=..."
                value={formData.video_url}
                onChangeText={(text) =>
                  setFormData({ ...formData, video_url: text })
                }
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., 5"
                keyboardType="number-pad"
                value={formData.duration_minutes}
                onChangeText={(text) =>
                  setFormData({ ...formData, duration_minutes: text })
                }
              />

              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 24,
                  marginBottom: 16,
                }}
                onPress={handleSaveSubsection}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  {formData.id ? 'Update' : 'Create'} Variant
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  // Questions View
  if (currentView === 'questions' && selectedSubsection) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('subsections')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selectedSubsection.subsection_name}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              padding: 14,
              borderRadius: 8,
              marginBottom: 16,
              alignItems: 'center',
            }}
            onPress={questions.length < 3 ? handleAddQuestion : () => Alert.alert('Limit', 'Maximum 3 questions per variant')}
            disabled={questions.length >= 3}
            opacity={questions.length >= 3 ? 0.5 : 1}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              + Add Question {questions.length >= 3 ? '(Max reached)' : `(${3 - questions.length} left)`}
            </Text>
          </TouchableOpacity>

          {questions.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>
              No questions yet. Add questions to test understanding.
            </Text>
          ) : (
            questions.map((question, index) => (
              <View
                key={question.id}
                style={{
                  backgroundColor: 'white',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: '#F59E42',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: 8,
                  }}
                >
                  Q{index + 1}: {question.question_text}
                </Text>
                {question.answer_options && (
                  <View style={{ marginLeft: 12, marginBottom: 12 }}>
                    {question.answer_options.map((option, optIdx) => (
                      <Text
                        key={optIdx}
                        style={{
                          fontSize: 13,
                          color:
                            optIdx === question.correct_answer_index
                              ? '#10B981'
                              : '#6B7280',
                          marginVertical: 2,
                          fontWeight:
                            optIdx === question.correct_answer_index ? '600' : '400',
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}) {option}
                        {optIdx === question.correct_answer_index && ' ✓ (Correct)'}
                      </Text>
                    ))}
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleEditQuestion(question)}
                    style={{
                      flex: 1,
                      backgroundColor: '#E0E7FF',
                      padding: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 13 }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteQuestion(question.id)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FEE2E2',
                      padding: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Modal for adding/editing questions */}
        <Modal visible={modalVisible && currentView === 'questions'} animationType="slide">
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>
                {formData.id ? 'Edit Question' : 'New Question'}
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.label}>Question *</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="What is the correct safety procedure?"
                value={formData.question_text}
                onChangeText={(text) =>
                  setFormData({ ...formData, question_text: text })
                }
                multiline
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Answer Options *</Text>
              {formData.options.map((option, idx) => (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontWeight: '600', color: '#6B7280', width: 30 }}>
                      {String.fromCharCode(65 + idx)})
                    </Text>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={`Option ${idx + 1}`}
                      value={option}
                      onChangeText={(text) => {
                        const newOptions = [...formData.options];
                        newOptions[idx] = text;
                        setFormData({ ...formData, options: newOptions });
                      }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setFormData({ ...formData, correct_answer_index: idx })
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor:
                          formData.correct_answer_index === idx
                            ? '#10B981'
                            : '#E5E7EB',
                      }}
                    >
                      <Text
                        style={{
                          color:
                            formData.correct_answer_index === idx ? 'white' : '#6B7280',
                          fontWeight: '600',
                          fontSize: 12,
                        }}
                      >
                        ✓
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8, marginBottom: 16 }}>
                Tap ✓ to mark correct answer
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 24,
                  marginBottom: 16,
                }}
                onPress={handleSaveQuestion}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  {formData.id ? 'Update' : 'Create'} Question
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

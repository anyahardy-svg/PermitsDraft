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
              <TouchableOpacity
                key={sub.id}
                onPress={() => {
                  setSelectedSubsection(sub);
                  loadQuestions(sub.id);
                  setCurrentView('questions');
                }}
                style={{
                  backgroundColor: 'white',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: '#8B5CF6',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                  {sub.subsection_name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                  Video: {sub.video_duration || 0} min
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              + Add Question (Max 3)
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
                {question.options && (
                  <View style={{ marginLeft: 12 }}>
                    {question.options.map((option, optIdx) => (
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
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';

import {
  getInductionsByBusinessUnit,
  startInduction,
  saveInductionAnswers,
  completeInduction,
} from '../api/inductions';
import { listCompanies } from '../api/companies';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';

/**
 * ContractorInductionScreen - Simplified for single inductions table
 * Flow: Info → Inductions List → Video → Questions → Signature → Complete
 */
export default function ContractorInductionScreen({ onComplete, onCancel, styles }) {
  const [step, setStep] = useState('info'); // info, inductionsList, video, questions, signature, complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Contractor Info
  const [contractorInfo, setContractorInfo] = useState({
    name: '',
    email: '',
    phone: '',
    companyId: '',
    businessUnitId: '',
  });
  const [companies, setCompanies] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Step 2: Inductions List
  const [allInductions, setAllInductions] = useState([]);
  const [selectedInductionIds, setSelectedInductionIds] = useState([]);
  const [inductionQueue, setInductionQueue] = useState([]); // Ordered list to complete
  const [currentInductionIndex, setCurrentInductionIndex] = useState(0);

  // Current induction being completed
  const currentInduction = inductionQueue[currentInductionIndex];

  // Step 3: Video
  const [videoWatched, setVideoWatched] = useState(false);

  // Step 4: Questions
  const [answers, setAnswers] = useState({});
  const hasQuestions = currentInduction?.question_1_text?.trim();

  // Step 5: Signature
  const [signatureText, setSignatureText] = useState('');

  // Load initial data
  useEffect(() => {
    loadCompaniesAndBU();
  }, []);

  const loadCompaniesAndBU = async () => {
    try {
      const [companiesData, buData] = await Promise.all([
        listCompanies(),
        listBusinessUnits(),
      ]);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setBusinessUnits(Array.isArray(buData) ? buData : []);
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const handleInfoContinue = async () => {
    if (!contractorInfo.name?.trim() || !contractorInfo.email?.trim()) {
      Alert.alert('Error', 'Please enter name and email');
      return;
    }
    if (!contractorInfo.companyId) {
      Alert.alert('Error', 'Please select a company');
      return;
    }
    if (!contractorInfo.businessUnitId) {
      Alert.alert('Error', 'Please select a business unit');
      return;
    }

    setLoading(true);
    try {
      const inductions = await getInductionsByBusinessUnit(contractorInfo.businessUnitId);
      setAllInductions(inductions || []);
      setStep('inductionsList');
    } catch (err) {
      Alert.alert('Error', 'Failed to load inductions');
    } finally {
      setLoading(false);
    }
  };

  const toggleInductionSelection = (inductionId) => {
    setSelectedInductionIds(prev =>
      prev.includes(inductionId)
        ? prev.filter(id => id !== inductionId)
        : [...prev, inductionId]
    );
  };

  const handleStartInductions = async () => {
    if (selectedInductionIds.length === 0) {
      Alert.alert('Error', 'Please select at least one induction');
      return;
    }

    // Build queue: compulsory first, then selected optional
    const compulsory = allInductions.filter(ind => ind.is_compulsory && selectedInductionIds.includes(ind.id));
    const optional = allInductions.filter(ind => !ind.is_compulsory && selectedInductionIds.includes(ind.id));
    setInductionQueue([...compulsory, ...optional]);
    setCurrentInductionIndex(0);
    setAnswers({});
    setSignatureText('');
    setVideoWatched(false);

    // Start first induction
    setStep('video');
  };

  const handleVideoComplete = () => {
    if (!currentInduction.video_url) {
      // No video, go straight to questions or signature
      handleGoToQuestions();
    } else if (hasQuestions) {
      setStep('questions');
    } else {
      setStep('signature');
    }
  };

  const handleGoToQuestions = () => {
    if (hasQuestions) {
      setStep('questions');
    } else {
      setStep('signature');
    }
  };

  const handleQuestionsComplete = () => {
    // Validate answers
    const questions = [
      currentInduction.question_1_text,
      currentInduction.question_2_text,
      currentInduction.question_3_text,
    ].filter(q => q?.trim());

    if (questions.length > 0 && Object.keys(answers).length < questions.length) {
      Alert.alert('Error', 'Please answer all questions');
      return;
    }

    setStep('signature');
  };

  const handleCompleteInduction = async () => {
    if (!signatureText?.trim()) {
      Alert.alert('Error', 'Please enter your signature');
      return;
    }

    setLoading(true);
    try {
      // Save answers
      if (Object.keys(answers).length > 0) {
        await saveInductionAnswers(
          'temp-contractor-id', // Will need contractor ID from signin
          currentInduction.id,
          answers
        );
      }

      // Complete induction
      await completeInduction(
        'temp-contractor-id',
        currentInduction.id,
        signatureText
      );

      // Move to next induction or complete
      if (currentInductionIndex < inductionQueue.length - 1) {
        setCurrentInductionIndex(currentInductionIndex + 1);
        setAnswers({});
        setSignatureText('');
        setVideoWatched(false);
        setStep('video');
      } else {
        setStep('complete');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to complete induction');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // STEP 1: INFO
  if (step === 'info') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.backButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contractor Induction</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
            Please provide your information to begin the induction process.
          </Text>

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Smith"
            value={contractorInfo.name}
            onChangeText={(text) => setContractorInfo({ ...contractorInfo, name: text })}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            keyboardType="email-address"
            value={contractorInfo.email}
            onChangeText={(text) => setContractorInfo({ ...contractorInfo, email: text })}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="021 123 4567"
            keyboardType="phone-pad"
            value={contractorInfo.phone}
            onChangeText={(text) => setContractorInfo({ ...contractorInfo, phone: text })}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Company *</Text>
          <TouchableOpacity
            style={[styles.input, { justifyContent: 'center', backgroundColor: showCompanyDropdown ? '#F3F4F6' : 'white' }]}
            onPress={() => setShowCompanyDropdown(!showCompanyDropdown)}
          >
            <Text style={{ color: contractorInfo.companyId ? '#1F2937' : '#9CA3AF' }}>
              {companies.find(c => c.id === contractorInfo.companyId)?.name || 'Select Company'} ▼
            </Text>
          </TouchableOpacity>
          {showCompanyDropdown && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, marginBottom: 16 }}>
              {companies.map(company => (
                <TouchableOpacity
                  key={company.id}
                  onPress={() => {
                    setContractorInfo({ ...contractorInfo, companyId: company.id });
                    setShowCompanyDropdown(false);
                  }}
                  style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                >
                  <Text style={{ fontSize: 14, color: '#1F2937' }}>{company.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Business Unit *</Text>
          <View style={{ gap: 8 }}>
            {businessUnits.map(bu => (
              <TouchableOpacity
                key={bu.id}
                onPress={() => setContractorInfo({ ...contractorInfo, businessUnitId: bu.id })}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: contractorInfo.businessUnitId === bu.id ? '#E0E7FF' : '#F3F4F6',
                  borderLeftWidth: 3,
                  borderLeftColor: contractorInfo.businessUnitId === bu.id ? '#3B82F6' : 'transparent',
                }}
              >
                <Text style={{ fontWeight: contractorInfo.businessUnitId === bu.id ? '600' : '400', color: '#1F2937' }}>
                  {bu.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && <Text style={{ color: '#DC2626', marginTop: 16 }}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { marginTop: 24 }]}
            onPress={handleInfoContinue}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // STEP 2: INDUCTIONS LIST
  if (step === 'inductionsList') {
    const compulsory = allInductions.filter(ind => ind.is_compulsory);
    const optional = allInductions.filter(ind => !ind.is_compulsory);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('info')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Inductions</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {compulsory.length > 0 && (
            <>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626', marginBottom: 12 }}>
                REQUIRED INDUCTIONS
              </Text>
              {compulsory.map(ind => (
                <TouchableOpacity
                  key={ind.id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: '#FEE2E2',
                    marginBottom: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: '#DC2626',
                  }}
                >
                  <Text style={{ fontWeight: '600', color: '#1F2937', fontSize: 14 }}>
                    {ind.induction_name}
                  </Text>
                  {ind.subsection_name && (
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                      Variant: {ind.subsection_name}
                    </Text>
                  )}
                  {ind.video_url && <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>📹 Video included</Text>}
                </TouchableOpacity>
              ))}
            </>
          )}

          {optional.length > 0 && (
            <>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#3B82F6', marginTop: compulsory.length ? 24 : 0, marginBottom: 12 }}>
                OPTIONAL INDUCTIONS
              </Text>
              {optional.map(ind => (
                <TouchableOpacity
                  key={ind.id}
                  onPress={() => toggleInductionSelection(ind.id)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: selectedInductionIds.includes(ind.id) ? '#E0E7FF' : '#F9FAFB',
                    marginBottom: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: selectedInductionIds.includes(ind.id) ? '#3B82F6' : '#E5E7EB',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: '#3B82F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selectedInductionIds.includes(ind.id) ? '#3B82F6' : 'white',
                      marginRight: 12,
                    }}
                  >
                    {selectedInductionIds.includes(ind.id) && (
                      <Text style={{ color: 'white', fontWeight: '700' }}>✓</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#1F2937', fontSize: 14 }}>
                      {ind.induction_name}
                    </Text>
                    {ind.subsection_name && (
                      <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                        {ind.subsection_name}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity style={[styles.button, { marginTop: 24 }]} onPress={handleStartInductions}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Start Inductions ({selectedInductionIds.length + compulsory.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // STEP 3: VIDEO
  if (step === 'video') {
    const getYoutubeEmbedUrl = (url) => {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
    };

    const embedUrl = currentInduction?.video_url ? getYoutubeEmbedUrl(currentInduction.video_url) : null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep('inductionsList'); setCurrentInductionIndex(0); }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {currentInduction.induction_name}
            {currentInduction.subsection_name && ` - ${currentInduction.subsection_name}`}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {embedUrl ? (
            <WebView
              source={{ uri: embedUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled={true}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#6B7280' }}>No video for this induction</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
          <TouchableOpacity
            style={[styles.button, { marginBottom: 8 }]}
            onPress={() => {
              setVideoWatched(true);
              handleVideoComplete();
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {hasQuestions ? 'Next: Questions' : 'Next: Signature'}
            </Text>
          </TouchableOpacity>
          {!embedUrl && (
            <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 12, marginTop: 8 }}>
              Click Next to continue
            </Text>
          )}
        </View>
      </View>
    );
  }

  // STEP 4: QUESTIONS
  if (step === 'questions') {
    const questions = [
      { num: 1, text: currentInduction.question_1_text, options: currentInduction.question_1_options, correct: currentInduction.question_1_correct_answer },
      { num: 2, text: currentInduction.question_2_text, options: currentInduction.question_2_options, correct: currentInduction.question_2_correct_answer },
      { num: 3, text: currentInduction.question_3_text, options: currentInduction.question_3_options, correct: currentInduction.question_3_correct_answer },
    ].filter(q => q.text?.trim());

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('video')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Questions</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {questions.map(q => (
            <View key={q.num} style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
                Q{q.num}: {q.text}
              </Text>
              {Array.isArray(q.options) && q.options.map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setAnswers({ ...answers, [`q${q.num}`]: idx })}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: answers[`q${q.num}`] === idx ? '#E0E7FF' : '#F9FAFB',
                    marginBottom: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: answers[`q${q.num}`] === idx ? '#3B82F6' : '#E5E7EB',
                  }}
                >
                  <Text style={{ color: '#1F2937', fontWeight: answers[`q${q.num}`] === idx ? '600' : '400' }}>
                    {String.fromCharCode(65 + idx)}) {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <TouchableOpacity style={[styles.button, { marginTop: 24 }]} onPress={handleQuestionsComplete}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Next: Signature</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // STEP 5: SIGNATURE
  if (step === 'signature') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(hasQuestions ? 'questions' : 'video')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Confirm</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            I confirm that I have completed the {currentInduction.induction_name} induction and understand all safety procedures.
          </Text>

          <Text style={styles.label}>Your Signature</Text>
          <TextInput
            style={[styles.input, { marginBottom: 16 }]}
            placeholder="Type your full name to sign"
            value={signatureText}
            onChangeText={setSignatureText}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleCompleteInduction}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {currentInductionIndex < inductionQueue.length - 1 ? 'Complete & Continue' : 'Complete Induction'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // STEP 6: COMPLETE
  if (step === 'complete') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>✓</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#10B981', marginBottom: 8 }}>
            Inductions Complete!
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
            You have successfully completed all selected inductions.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onComplete}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              Return to Kiosk
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

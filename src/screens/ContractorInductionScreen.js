import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';

import {
  getInductionsForContractor,
  getInductionSubsections,
  getInductionQuestions,
  saveInductionProgress,
  completeInductionSubsection,
} from '../api/inductions';
import { listCompanies } from '../api/companies';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';

/**
 * ContractorInductionScreen
 * Complete induction workflow: contractor info → compulsory videos → optional selection → questions → signature
 */
export default function ContractorInductionScreen({ onComplete, onCancel, styles }) {
  // Steps: 'info', 'compulsory', 'optional', 'induction', 'complete'
  const [currentStep, setCurrentStep] = useState('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ======== Step 1: Contractor Info ========
  const [contractorInfo, setContractorInfo] = useState({
    name: '',
    email: '',
    phone: '',
    companyId: '',
    businessUnitIds: [],
    siteIds: [],
  });

  const [companies, setCompanies] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const companiesResult = await listCompanies();
      if (companiesResult.success) setCompanies(companiesResult.data);

      const busUnitsResult = await listBusinessUnits();
      if (busUnitsResult.success) setBusinessUnits(busUnitsResult.data);

      const sitesResult = await listSites();
      if (sitesResult.success) setSites(sitesResult.data);
    } catch (err) {
      console.error('Error loading dropdown data:', err);
    }
  };

  // Filter sites by selected business units
  const availableSites = sites.filter(site =>
    contractorInfo.businessUnitIds.includes(site.business_unit_id)
  );

  // ======== Step 2: Get Compulsory Inductions ========
  const [inductionsData, setInductionsData] = useState({
    compulsory: [],
    optional: [],
  });

  const loadInductions = async () => {
    if (!contractorInfo.businessUnitIds.length) {
      setError('Please select at least one business unit');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await getInductionsForContractor(
        'temp-contractor-id', // Will use this as placeholder
        contractorInfo.businessUnitIds,
        contractorInfo.siteIds
      );

      if (result.success) {
        setInductionsData(result.data);
        setCurrentStep('compulsory');
      } else {
        setError(result.error || 'Failed to load inductions');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ======== Step 3: Selected Optional Inductions ========
  const [selectedOptional, setSelectedOptional] = useState([]);

  // ======== Step 4: Induction Progress ========
  const [currentInductionIndex, setCurrentInductionIndex] = useState(0);
  const [currentSubsectionIndex, setCurrentSubsectionIndex] = useState(0);
  const [subsections, setSubsections] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [videoWatched, setVideoWatched] = useState(false);
  const [signature, setSignature] = useState(null);
  const [signatureText, setSignatureText] = useState('');

  // Get list of all inductions to complete (compulsory + selected optional)
  const allInductionsToComplete = [
    ...inductionsData.compulsory,
    ...inductionsData.optional.filter(opt =>
      selectedOptional.includes(opt.id)
    ),
  ];

  const currentInduction = allInductionsToComplete[currentInductionIndex];

  // Load subsections when induction changes
  useEffect(() => {
    if (currentInduction && currentStep === 'induction') {
      loadSubsections();
    }
  }, [currentInductionIndex, currentStep]);

  const loadSubsections = async () => {
    setLoading(true);
    try {
      const result = await getInductionSubsections(currentInduction.id);
      if (result.success) {
        setSubsections(result.data);
        setCurrentSubsectionIndex(0);
        setVideoWatched(false);
        setUserAnswers({});
        loadQuestions(result.data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (subsectionId) => {
    try {
      const result = await getInductionQuestions(subsectionId);
      if (result.success) {
        setCurrentQuestions(result.data);
      }
    } catch (err) {
      console.error('Error loading questions:', err);
    }
  };

  // ======== Handlers ========

  const handleInfoContinue = () => {
    if (!contractorInfo.name || !contractorInfo.email) {
      setError('Please fill in name and email');
      return;
    }
    if (!contractorInfo.companyId) {
      setError('Please select a company');
      return;
    }
    if (!contractorInfo.businessUnitIds.length) {
      setError('Please select at least one business unit');
      return;
    }
    if (!contractorInfo.siteIds.length) {
      setError('Please select at least one site');
      return;
    }

    setError('');
    loadInductions();
  };

  const handleCompulsoryComplete = () => {
    if (inductionsData.optional.length > 0) {
      setCurrentStep('optional');
    } else {
      // Skip optional and go straight to inductions
      setCurrentStep('induction');
    }
  };

  const handleOptionalComplete = () => {
    setCurrentStep('induction');
  };

  const handleAnswerChange = (questionNumber, answer) => {
    setUserAnswers({
      ...userAnswers,
      [`q${questionNumber}`]: answer,
    });
  };

  const handleSubmitAnswers = async () => {
    if (Object.keys(userAnswers).length < currentQuestions.length) {
      setError('Please answer all questions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentSubsection = subsections[currentSubsectionIndex];
      const result = await saveInductionProgress(
        'temp-contractor-id',
        contractorInfo.siteIds[0],
        contractorInfo.businessUnitIds[0],
        currentSubsection.id,
        userAnswers
      );

      if (result.success) {
        // Check if more subsections
        if (currentSubsectionIndex < subsections.length - 1) {
          // Move to next subsection
          setCurrentSubsectionIndex(currentSubsectionIndex + 1);
          setVideoWatched(false);
          setUserAnswers({});
          loadQuestions(subsections[currentSubsectionIndex + 1].id);
        } else if (currentInductionIndex < allInductionsToComplete.length - 1) {
          // Move to next induction
          setCurrentInductionIndex(currentInductionIndex + 1);
        } else {
          // All done, show signature screen
          setCurrentStep('signature');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureSignature = () => {
    if (signatureText.trim().length < 3) {
      setError('Please enter at least 3 characters as signature');
      return;
    }
    setSignature(signatureText);
  };

  const handleCompleteInduction = async () => {
    if (!signature) {
      setError('Please provide a signature');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In real implementation, upload signature and call API
      // For now, just show completion
      setCurrentStep('complete');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ======== UI Renderers ========

  const renderInfoStep = () => (
    <ScrollView style={[styles.container, { padding: 20 }]}>
      <Text style={[styles.heading, { marginBottom: 20 }]}>Contractor Information</Text>

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter full name"
        value={contractorInfo.name}
        onChangeText={(text) => setContractorInfo({ ...contractorInfo, name: text })}
      />

      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter email"
        value={contractorInfo.email}
        onChangeText={(text) => setContractorInfo({ ...contractorInfo, email: text })}
        keyboardType="email-address"
      />

      <Text style={styles.label}>Phone (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter phone"
        value={contractorInfo.phone}
        onChangeText={(text) => setContractorInfo({ ...contractorInfo, phone: text })}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Business Units *</Text>
      <View style={styles.checkboxGroup}>
        {businessUnits.map((bu) => (
          <TouchableOpacity
            key={bu.id}
            style={styles.checkbox}
            onPress={() => {
              const isSelected = contractorInfo.businessUnitIds.includes(bu.id);
              setContractorInfo({
                ...contractorInfo,
                businessUnitIds: isSelected
                  ? contractorInfo.businessUnitIds.filter((id) => id !== bu.id)
                  : [...contractorInfo.businessUnitIds, bu.id],
              });
            }}
          >
            <View
              style={[
                styles.checkboxBox,
                contractorInfo.businessUnitIds.includes(bu.id) && styles.checkboxBoxChecked,
              ]}
            >
              {contractorInfo.businessUnitIds.includes(bu.id) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>{bu.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Company *</Text>
      <View style={{ position: 'relative', zIndex: 10 }}>
        <TouchableOpacity
          style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
          onPress={() => setShowCompanyDropdown(!showCompanyDropdown)}
        >
          <Text style={{ color: contractorInfo.companyId ? '#1F2937' : '#9CA3AF', fontSize: 16, flex: 1 }}>
            {companies.find(c => c.id === contractorInfo.companyId)?.name || 'Select a company...'}
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>▼</Text>
        </TouchableOpacity>
        
        {showCompanyDropdown && (
          <View style={{ 
            borderWidth: 1, 
            borderColor: '#D1D5DB', 
            borderTopWidth: 0, 
            borderRadius: 0, 
            maxHeight: 200,
            backgroundColor: 'white',
            position: 'absolute',
            top: 48,
            left: 0,
            right: 0,
            zIndex: 100,
          }}>
            <ScrollView>
              {companies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={{ 
                    padding: 12, 
                    borderBottomWidth: 1, 
                    borderBottomColor: '#F3F4F6',
                    backgroundColor: contractorInfo.companyId === company.id ? '#EFF6FF' : 'white'
                  }}
                  onPress={() => {
                    setContractorInfo({ ...contractorInfo, companyId: company.id });
                    setShowCompanyDropdown(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: contractorInfo.companyId === company.id ? '#2563EB' : '#1F2937', fontWeight: contractorInfo.companyId === company.id ? '600' : '400' }}>
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <Text style={styles.label}>Sites *</Text>
      <View style={styles.checkboxGroup}>
        {availableSites.map((site) => (
          <TouchableOpacity
            key={site.id}
            style={styles.checkbox}
            onPress={() => {
              const isSelected = contractorInfo.siteIds.includes(site.id);
              setContractorInfo({
                ...contractorInfo,
                siteIds: isSelected
                  ? contractorInfo.siteIds.filter((id) => id !== site.id)
                  : [...contractorInfo.siteIds, site.id],
              });
            }}
          >
            <View
              style={[
                styles.checkboxBox,
                contractorInfo.siteIds.includes(site.id) && styles.checkboxBoxChecked,
              ]}
            >
              {contractorInfo.siteIds.includes(site.id) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>{site.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, { marginTop: 30, marginBottom: 20 }]}
        onPress={handleInfoContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCompulsoryStep = () => (
    <ScrollView style={[styles.container, { padding: 20 }]}>
      <Text style={[styles.heading, { marginBottom: 20 }]}>
        Compulsory Inductions
      </Text>

      <Text style={styles.subheading}>
        You must complete the following before you can work:
      </Text>

      {inductionsData.compulsory.map((induction, index) => (
        <View key={induction.id} style={styles.inductionCard}>
          <Text style={styles.inductionTitle}>
            {index + 1}. {induction.induction_name}
          </Text>
          <Text style={styles.inductionStatus}>
            Status: {induction.progress || 'Not Started'}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.button, { marginTop: 30 }]}
        onPress={handleCompulsoryComplete}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderOptionalStep = () => (
    <ScrollView style={[styles.container, { padding: 20 }]}>
      <Text style={[styles.heading, { marginBottom: 20 }]}>Optional Inductions</Text>

      <Text style={styles.subheading}>
        Select additional inductions you'd like to complete:
      </Text>

      {inductionsData.optional.map((induction) => (
        <TouchableOpacity
          key={induction.id}
          style={styles.checkbox}
          onPress={() => {
            const isSelected = selectedOptional.includes(induction.id);
            setSelectedOptional(
              isSelected
                ? selectedOptional.filter((id) => id !== induction.id)
                : [...selectedOptional, induction.id]
            );
          }}
        >
          <View
            style={[
              styles.checkboxBox,
              selectedOptional.includes(induction.id) && styles.checkboxBoxChecked,
            ]}
          >
            {selectedOptional.includes(induction.id) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxLabel}>{induction.induction_name}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.button, { marginTop: 30 }]}
        onPress={handleOptionalComplete}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderInductionStep = () => {
    if (!currentInduction || !subsections.length) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    const currentSubsection = subsections[currentSubsectionIndex];
    const isLastInduction = currentInductionIndex === allInductionsToComplete.length - 1;
    const isLastSubsection = currentSubsectionIndex === subsections.length - 1;

    return (
      <ScrollView style={[styles.container, { padding: 20 }]}>
        <Text style={styles.heading}>{currentInduction.induction_name}</Text>

        {subsections.length > 1 && (
          <Text style={styles.subheading}>
            Section {currentSubsectionIndex + 1} of {subsections.length}:{' '}
            {currentSubsection.subsection_name}
          </Text>
        )}

        {/* Video Player */}
        <View style={styles.videoContainer}>
          <WebView
            source={{ uri: currentSubsection.video_url }}
            style={{ height: 250, marginBottom: 10 }}
            startInLoadingState
            renderLoading={() => <ActivityIndicator />}
          />
        </View>

        {/* Watch confirmation */}
        {!videoWatched && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setVideoWatched(true)}
          >
            <Text style={styles.buttonText}>Video Watched - Continue</Text>
          </TouchableOpacity>
        )}

        {videoWatched && (
          <>
            {/* Questions */}
            <Text style={styles.heading}>Assessment Questions</Text>

            {currentQuestions.map((question) => (
              <View key={question.id} style={styles.questionCard}>
                <Text style={styles.questionText}>
                  Q{question.question_number}: {question.question_text}
                </Text>

                {question.question_type === 'multiple-choice' &&
                  question.options &&
                  Object.entries(question.options).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.optionButton,
                        userAnswers[`q${question.question_number}`] === key &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => handleAnswerChange(question.question_number, key)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          userAnswers[`q${question.question_number}`] === key &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            ))}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, { marginTop: 20 }]}
              onPress={handleSubmitAnswers}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLastInduction && isLastSubsection
                    ? 'Complete & Sign'
                    : 'Next'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  };

  const renderSignatureStep = () => (
    <ScrollView style={[styles.container, { padding: 20 }]}>
      <Text style={[styles.heading, { marginBottom: 20 }]}>Sign & Complete</Text>

      <Text style={styles.subheading}>
        By signing below, you acknowledge that you have completed all inductions and understand the site safety requirements.
      </Text>

      <Text style={styles.label}>Your Signature (Full Name)</Text>
      <TextInput
        style={[styles.input, { marginBottom: 20 }]}
        placeholder="Type your full name here"
        value={signatureText}
        onChangeText={setSignatureText}
      />

      {signature && (
        <View style={{ 
          padding: 12, 
          backgroundColor: '#ECFDF5', 
          borderRadius: 6, 
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#10B981'
        }}>
          <Text style={{ color: '#065F46', fontSize: 14 }}>
            ✓ Signature accepted: {signature}
          </Text>
        </View>
      )}

      {error && <Text style={[styles.errorText, { marginBottom: 10 }]}>{error}</Text>}

      <TouchableOpacity 
        style={[styles.button, signature && { opacity: 0.6 }]}
        onPress={handleCaptureSignature}
      >
        <Text style={styles.buttonText}>
          {signature ? '✓ Signed' : 'Accept Signature'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { marginTop: 10, backgroundColor: signature ? '#10B981' : '#D1D5DB' }]}
        onPress={handleCompleteInduction}
        disabled={!signature || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Finish Induction</Text>
        )}

      </TouchableOpacity>
    </ScrollView>
  );

  const renderCompleteStep = () => (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[styles.heading, { marginBottom: 40 }]}>✓ Congratulations!</Text>

      <Text style={styles.text}>
        You have successfully completed all inductions and are now approved to work on site.
      </Text>

      <View style={styles.servicesList}>
        <Text style={styles.subheading}>Services Unlocked:</Text>
        {/* Services will be shown here based on completed inductions */}
      </View>

      <TouchableOpacity
        style={[styles.button, { marginTop: 40 }]}
        onPress={() => onComplete && onComplete()}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  // ======== Main Render ========

  return (
    <View style={styles.container}>
      {currentStep === 'info' && renderInfoStep()}
      {currentStep === 'compulsory' && renderCompulsoryStep()}
      {currentStep === 'optional' && renderOptionalStep()}
      {currentStep === 'induction' && renderInductionStep()}
      {currentStep === 'signature' && renderSignatureStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </View>
  );
}

// Note: Styles should be passed from parent component
// or imported from a common stylesheet

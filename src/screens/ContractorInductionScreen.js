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
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';

import {
  getInductionsByBusinessUnit,
  startInduction,
  saveInductionAnswers,
  completeInduction,
} from '../api/inductions';
import { listCompanies, createCompany } from '../api/companies';
import { listContractors, createContractor, getContractor } from '../api/contractors';
import { listBusinessUnits } from '../api/business_units';
import { getSitesByBusinessUnits } from '../api/sites';

/**
 * ContractorInductionScreen - Simplified for single inductions table
 * Flow: Info → Inductions List → Video → Questions → Signature → Complete
 */
export default function ContractorInductionScreen({ onComplete, onCancel, styles }) {
  const [step, setStep] = useState('info'); // info, inductionsList, video, questions, signature, complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0: Select existing or new contractor
  const [isNewContractor, setIsNewContractor] = useState(null); // null = choosing, true = new, false = existing
  const [contractors, setContractors] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);

  // Step 1: Contractor Info
  const [contractorInfo, setContractorInfo] = useState({
    id: '', // For existing contractors
    name: '',
    email: '',
    phone: '',
    companyId: '',
    selectedBusinessUnitIds: [],
    selectedSiteIds: [],
  });
  const [companies, setCompanies] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [companySearchText, setCompanySearchText] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  // Step 2: Inductions List
  const [allInductions, setAllInductions] = useState([]);
  const [compulsoryInductions, setCompulsoryInductions] = useState([]);
  const [optionalInductions, setOptionalInductions] = useState([]);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState([]);
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
      const [companiesData, buData, contractorsData] = await Promise.all([
        listCompanies(),
        listBusinessUnits(),
        listContractors(),
      ]);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setBusinessUnits(Array.isArray(buData) ? buData : []);
      setContractors(Array.isArray(contractorsData) ? contractorsData : []);
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      Alert.alert('Error', 'Please enter a company name');
      return;
    }

    setLoading(true);
    try {
      const newCompany = await createCompany({
        name: newCompanyName,
        is_manually_created: true,
      });
      setCompanies([...companies, newCompany]);
      setContractorInfo({ ...contractorInfo, companyId: newCompany.id });
      setShowAddCompanyModal(false);
      setNewCompanyName('');
      setCompanySearchText('');
      setShowCompanyDropdown(false);
      Alert.alert('Success', 'Company added successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to add company');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExistingContractor = async (contractorId) => {
    try {
      setLoading(true);
      const contractor = await getContractor(contractorId);
      setContractorInfo({
        id: contractor.id,
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone || '',
        companyId: contractor.company_id,
        selectedBusinessUnitIds: [],
        selectedSiteIds: [],
      });
      setSelectedContractorId(contractorId);
      setShowContractorDropdown(false);
      setIsNewContractor(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to load contractor');
    } finally {
      setLoading(false);
    }
  };

  const handleNewContractor = () => {
    setIsNewContractor(true);
    setContractorInfo({
      id: '',
      name: '',
      email: '',
      phone: '',
      companyId: '',
      selectedBusinessUnitIds: [],
      selectedSiteIds: [],
    });
  };

  const handleBusinessUnitChange = async (buId) => {
    const currentBUs = contractorInfo.selectedBusinessUnitIds || [];
    const newSelectedBUs = currentBUs.includes(buId)
      ? currentBUs.filter(id => id !== buId)
      : [...currentBUs, buId];

    setContractorInfo({ ...contractorInfo, selectedBusinessUnitIds: newSelectedBUs, selectedSiteIds: [] });
    
    // Load sites for all selected business units
    if (newSelectedBUs.length > 0) {
      try {
        const sitesData = await getSitesByBusinessUnits(newSelectedBUs);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      } catch (err) {
        console.error('Failed to load sites:', err);
      }
    } else {
      setSites([]);
    }
  };

  const toggleSiteSelection = (siteId) => {
    setContractorInfo(prev => ({
      ...prev,
      selectedSiteIds: (prev.selectedSiteIds || []).includes(siteId)
        ? (prev.selectedSiteIds || []).filter(id => id !== siteId)
        : [...(prev.selectedSiteIds || []), siteId]
    }));
  };

  const handleInfoContinue = async () => {
    console.log('BUTTON CLICKED - handleInfoContinue called');
    
    if (!contractorInfo.name?.trim() || !contractorInfo.email?.trim()) {
      Alert.alert('Error', 'Please enter name and email');
      return;
    }
    if (!contractorInfo.companyId) {
      Alert.alert('Error', 'Please select a company');
      return;
    }
    const selectedBUs = contractorInfo.selectedBusinessUnitIds || [];
    if (selectedBUs.length === 0) {
      Alert.alert('Error', 'Please select at least one business unit');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting induction load for BUs:', selectedBUs);
      // If new contractor, create them first
      let contractorId = contractorInfo.id;
      if (isNewContractor && !contractorId) {
        const newContractor = await createContractor({
          name: contractorInfo.name,
          email: contractorInfo.email,
          phone: contractorInfo.phone,
          company_id: contractorInfo.companyId,
          service_ids: [],
        });
        contractorId = newContractor.id;
        setContractorInfo({ ...contractorInfo, id: contractorId });
      }

      // Get inductions for all selected business units
      let allInductionsData = [];
      for (const buId of selectedBUs) {
        const inductionsForBU = await getInductionsByBusinessUnit(buId);
        console.log('Got inductions for BU', buId, ':', inductionsForBU?.length || 0);
        if (Array.isArray(inductionsForBU)) {
          allInductionsData = [...allInductionsData, ...inductionsForBU];
        }
      }

      console.log('Total inductions:', allInductionsData.length);

      // Remove duplicates (in case same induction applies to multiple BUs)
      const uniqueInductions = Array.from(new Map(allInductionsData.map(ind => [ind.id, ind])).values());
      
      // Separate compulsory and optional, considering site-specific rules
      const compulsory = [];
      const optional = [];
      const selectedSites = contractorInfo.selectedSiteIds || [];

      uniqueInductions.forEach(ind => {
        const isSiteSpecific = ind.site_id !== null;
        const isApplicableToSelectedSites = !isSiteSpecific || selectedSites.includes(ind.site_id);

        if (ind.is_compulsory && isApplicableToSelectedSites) {
          compulsory.push(ind);
        } else if (!ind.is_compulsory) {
          optional.push(ind);
        }
      });

      console.log('Compulsory:', compulsory.length, 'Optional:', optional.length);

      setCompulsoryInductions(compulsory);
      setOptionalInductions(optional);
      setAllInductions(uniqueInductions);
      setSelectedOptionalIds([]);
      
      console.log('About to setStep to inductionsList');
      setStep('inductionsList');
      console.log('setStep called');
    } catch (err) {
      console.error('ERROR in handleInfoContinue:', err);
      Alert.alert('Error', 'Failed to load inductions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleInductionSelection = (inductionId) => {
    setSelectedOptionalIds(prev =>
      prev.includes(inductionId)
        ? prev.filter(id => id !== inductionId)
        : [...prev, inductionId]
    );
  };

  const handleStartInductions = async () => {
    if (compulsoryInductions.length === 0 && selectedOptionalIds.length === 0) {
      Alert.alert('Error', 'Please select at least one induction');
      return;
    }

    // Build queue: compulsory first, then selected optional
    const selectedOptional = optionalInductions.filter(ind => selectedOptionalIds.includes(ind.id));
    setInductionQueue([...compulsoryInductions, ...selectedOptional]);
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
          contractorInfo.id,
          currentInduction.id,
          answers
        );
      }

      // Complete induction
      await completeInduction(
        contractorInfo.id,
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

  // STEP 1: INFO - First choose existing or new contractor
  if (step === 'info' && isNewContractor === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.backButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contractor Induction</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 24 }}>
            Are you a returning contractor or new?
          </Text>

          <TouchableOpacity 
            onPress={() => {
              setIsNewContractor(true);
              setCompanySearchText('');
              setShowCompanyDropdown(false);
              setContractorInfo({
                id: '',
                name: '',
                email: '',
                phone: '',
                companyId: '',
                businessUnitId: '',
                selectedSiteIds: [],
              });
            }}
            style={{ backgroundColor: '#E0E7FF', borderRadius: 12, padding: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#3B82F6' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#3B82F6', marginBottom: 8 }}>+ New Contractor</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>I'm completing my induction for the first time</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowContractorDropdown(true)}
            style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 20, borderLeftWidth: 4, borderLeftColor: '#10B981' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981', marginBottom: 8 }}>↩️ Returning Contractor</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>I need to redo my induction</Text>
          </TouchableOpacity>

          {showContractorDropdown && (
            <View style={{ marginTop: 16, backgroundColor: '#F9FAFB', borderRadius: 8 }}>
              <TouchableOpacity 
                onPress={() => setShowContractorDropdown(false)}
                style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Close</Text>
              </TouchableOpacity>
              <ScrollView style={{ maxHeight: 300 }}>
                {contractors.map(contractor => (
                  <TouchableOpacity
                    key={contractor.id}
                    onPress={() => handleSelectExistingContractor(contractor.id)}
                    style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>{contractor.name}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{contractor.email}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // STEP 1: INFO - Fill in contractor details
  if (step === 'info' && isNewContractor !== null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setIsNewContractor(null); setShowContractorDropdown(false); }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Your Information</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {isNewContractor && (
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, fontStyle: 'italic' }}>
              Please fill in your details to get started
            </Text>
          )}

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
          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            placeholder="Search or type company name..."
            value={contractorInfo.companyId ? companies.find(c => c.id === contractorInfo.companyId)?.name || companySearchText : companySearchText}
            onChangeText={(text) => {
              setCompanySearchText(text);
              if (!text.trim()) setContractorInfo({ ...contractorInfo, companyId: '' });
              setShowCompanyDropdown(true);
            }}
            onFocus={() => setShowCompanyDropdown(true)}
          />
          {showCompanyDropdown && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginBottom: 16, marginTop: 0 }}>
              {companies
                .filter(company => company.name.toLowerCase().includes(companySearchText.toLowerCase()))
                .map(company => (
                  <TouchableOpacity
                    key={company.id}
                    onPress={() => {
                      setContractorInfo({ ...contractorInfo, companyId: company.id });
                      setCompanySearchText('');
                      setShowCompanyDropdown(false);
                    }}
                    style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  >
                    <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '500' }}>{company.name}</Text>
                  </TouchableOpacity>
                ))}
              {companies.filter(company => company.name.toLowerCase().includes(companySearchText.toLowerCase())).length === 0 && companySearchText.trim() && (
                <TouchableOpacity
                  onPress={() => {
                    setNewCompanyName(companySearchText);
                    setShowCompanyDropdown(false);
                    setShowAddCompanyModal(true);
                  }}
                  style={{ paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#E0E7FF' }}
                >
                  <Text style={{ fontSize: 14, color: '#3B82F6', fontWeight: '600' }}>+ Add "{companySearchText}"</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Business Units (select one or more) *</Text>
          <View style={{ gap: 8 }}>
            {businessUnits.map(bu => {
              const isSelected = (contractorInfo.selectedBusinessUnitIds || []).includes(bu.id);
              return (
                <TouchableOpacity
                  key={bu.id}
                  onPress={() => handleBusinessUnitChange(bu.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#E0E7FF' : '#F3F4F6',
                  }}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#3B82F6' : 'white', marginRight: 10 }}>
                    {isSelected && <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: isSelected ? '600' : '400' }}>{bu.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {sites.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Sites (select one or more)</Text>
              <View style={{ gap: 8 }}>
                {sites.map(site => {
                  const isSelected = (contractorInfo.selectedSiteIds || []).includes(site.id);
                  return (
                    <TouchableOpacity
                      key={site.id}
                      onPress={() => toggleSiteSelection(site.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: isSelected ? '#E0E7FF' : '#F3F4F6',
                      }}
                    >
                      <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#3B82F6' : 'white', marginRight: 10 }}>
                        {isSelected && <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: isSelected ? '600' : '400' }}>{site.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {error && <Text style={{ color: '#DC2626', marginTop: 16 }}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { marginTop: 24 }]}
            onPress={handleInfoContinue}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Continue</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Add Company Modal */}
        <Modal visible={showAddCompanyModal} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#1F2937' }}>Add New Company</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>This will be marked as manually created</Text>
              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder="Company Name"
                value={newCompanyName}
                onChangeText={setNewCompanyName}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddCompanyModal(false);
                    setNewCompanyName('');
                    setCompanySearchText('');
                  }}
                  style={{ flex: 1, backgroundColor: '#E5E7EB', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddCompany}
                  disabled={loading}
                  style={{ flex: 1, backgroundColor: loading ? '#9CA3AF' : '#3B82F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>{loading ? 'Adding...' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // STEP 2: INDUCTIONS LIST
  if (step === 'inductionsList') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('info')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Inductions</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {compulsoryInductions.length > 0 && (
            <>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626', marginBottom: 12 }}>
                REQUIRED INDUCTIONS
              </Text>
              {compulsoryInductions.map(ind => (
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

          {optionalInductions.length > 0 && (
            <>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#3B82F6', marginTop: compulsoryInductions.length ? 24 : 0, marginBottom: 12 }}>
                OPTIONAL INDUCTIONS
              </Text>
              {optionalInductions.map(ind => (
                <TouchableOpacity
                  key={ind.id}
                  onPress={() => toggleInductionSelection(ind.id)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: selectedOptionalIds.includes(ind.id) ? '#E0E7FF' : '#F9FAFB',
                    marginBottom: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: selectedOptionalIds.includes(ind.id) ? '#3B82F6' : '#E5E7EB',
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
                      backgroundColor: selectedOptionalIds.includes(ind.id) ? '#3B82F6' : 'white',
                      marginRight: 12,
                    }}
                  >
                    {selectedOptionalIds.includes(ind.id) && (
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
              Start Inductions ({selectedOptionalIds.length + compulsoryInductions.length})
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

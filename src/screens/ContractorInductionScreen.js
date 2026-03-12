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
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { supabase } from '../supabaseClient';
import {
  getInductionsByBusinessUnit,
  getInductionsForContractor,
  getContractorInductionProgress,
  getInductionProgress,
  startInduction,
  saveInductionAnswers,
  saveInductionProgress,
  completeInduction,
} from '../api/inductions';
import { listCompanies, createCompany } from '../api/companies';
import { listContractors, createContractor, getContractor, updateContractor } from '../api/contractors';
import { listBusinessUnits } from '../api/business_units';
import { getSitesByBusinessUnits } from '../api/sites';
import { listServicesByBusinessUnit } from '../api/services';

/**
 * ContractorInductionScreen - Simplified for single inductions table
 * Flow: Info → Inductions List → Video → Questions → Signature → Complete
 */

// Helper function to extract YouTube video ID and create embed URL
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  let videoId = null;
  
  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v');
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('youtube.com/embed/')[1]?.split('?')[0];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    // Assume it's a video ID
    videoId = url;
  }
  
  return videoId ? `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0` : null;
};

export default function ContractorInductionScreen({ onComplete, onCancel, styles }) {
  const [step, setStep] = useState('info'); // info, inductionsList, inductionBoard, signature, complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0: Select existing or new contractor
  const [isNewContractor, setIsNewContractor] = useState(null); // null = choosing, true = new, false = existing, 'resume' = resuming saved
  const [contractors, setContractors] = useState([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);
  const [incompleteInductions, setIncompleteInductions] = useState([]);
  const [showIncompleteInductionsDropdown, setShowIncompleteInductionsDropdown] = useState(false);
  
  // Returning Contractor filter state
  const [returningFilterCompanyId, setReturningFilterCompanyId] = useState('');
  const [returningFilterBUId, setReturningFilterBUId] = useState('');
  const [returningFilteredContractors, setReturningFilteredContractors] = useState([]);
  const [showReturningBUDropdown, setShowReturningBUDropdown] = useState(false);
  const [showReturningCompanyDropdown, setShowReturningCompanyDropdown] = useState(false);

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
  const [inductionQueue, setInductionQueue] = useState([]); // All selected inductions to complete
  
  // NEW: Board workflow state
  const [completedInductionIds, setCompletedInductionIds] = useState([]); // IDs of completed inductions
  const [selectedInductionId, setSelectedInductionId] = useState(null); // Which induction is open in modal
  const [modalVisible, setModalVisible] = useState(false); // Whether induction modal is open
  const [currentModalInduction, setCurrentModalInduction] = useState(null); // Current induction in modal
  const [modalStep, setModalStep] = useState('video'); // video, questions, complete
  const [modalAnswers, setModalAnswers] = useState({}); // Answers for current modal induction

  // Step 3: Video
  const [videoWatched, setVideoWatched] = useState(false);

  // Step 4: Questions
  const [answers, setAnswers] = useState({});

  // Step 5: Signature
  const [signatureText, setSignatureText] = useState('');

  // Load initial data
  useEffect(() => {
    loadCompaniesAndBU();
  }, []);

  // Load sites when business units are selected (for pre-filled returning contractors)
  useEffect(() => {
    const loadSitesForBUs = async () => {
      const selectedBUs = contractorInfo.selectedBusinessUnitIds || [];
      if (selectedBUs.length > 0) {
        try {
          const sitesData = await getSitesByBusinessUnits(selectedBUs);
          setSites(Array.isArray(sitesData) ? sitesData : []);
        } catch (err) {
          console.error('Failed to load sites:', err);
        }
      } else {
        setSites([]);
      }
    };
    
    loadSitesForBUs();
  }, [contractorInfo.selectedBusinessUnitIds]);

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

  // Helper: Render standardized header with screen context
  const renderHeader = (screenName, onBack, backText = '←') => {
    return (
      <View style={{ backgroundColor: '#3B82F6', paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 24, color: 'white', fontWeight: '600' }}>{backText}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' }}>
          {screenName}
        </Text>
        <View style={{ width: 40 }} />
      </View>
    );
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
        selectedBusinessUnitIds: contractor.business_unit_ids || [],
        selectedSiteIds: contractor.site_ids || [],
      });
      setSelectedContractorId(contractorId);
      setShowContractorDropdown(false);
      
      // Show their info screen so they can review/update details before inductions
      // For returning contractors, show info screen first
      setStep('info');
      setIsNewContractor(false); // Mark as existing contractor
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

  const handleLoadIncompleteInductions = async () => {
    try {
      setLoading(true);
      // Load all contractors and check which ones have incomplete inductions
      const allContractorsData = await listContractors();
      const contractorsWithIncomplete = [];
      
      for (const contractor of allContractorsData) {
        const progressData = await getContractorInductionProgress(contractor.id);
        const incomplete = progressData.filter(p => p.status === 'in_progress');
        if (incomplete.length > 0) {
          contractorsWithIncomplete.push({
            ...contractor,
            incompleteCount: incomplete.length
          });
        }
      }
      
      if (contractorsWithIncomplete.length === 0) {
        Alert.alert('No Saved Inductions', 'No contractors have incomplete inductions to resume.');
        return;
      }
      
      // Temporarily store contractors with incomplete inductions
      setContractors(contractorsWithIncomplete);
      setIsNewContractor('choose-contractor-for-resume');
    } catch (err) {
      Alert.alert('Error', 'Failed to load contractors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeContractorSelected = async (contractorId) => {
    try {
      setLoading(true);
      // Get the contractor details
      const contractor = await getContractor(contractorId);
      
      // Load their business units and sites from previous work
      const contractorBUs = contractor.business_unit_ids || [];
      let contractorSites = [];
      if (contractorBUs.length > 0 && contractor.site_ids) {
        contractorSites = contractor.site_ids || [];
      }
      
      setContractorInfo({
        id: contractor.id,
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone || '',
        companyId: contractor.company_id,
        selectedBusinessUnitIds: contractorBUs,
        selectedSiteIds: contractorSites,
      });
      setSelectedContractorId(contractorId);
      
      // Load their progress to see what's completed vs in_progress
      const progressData = await getContractorInductionProgress(contractorId);
      
      if (progressData.length === 0) {
        Alert.alert('No Inductions', `${contractor.name} has no inductions to resume.`);
        setIsNewContractor(null);
      } else {
        // Get the unique induction IDs they're assigned to
        const assignedInductionIds = [...new Set(progressData.map(p => p.induction_id))];
        console.log('🔍 Contractor assigned inductions:', assignedInductionIds.length);
        
        // Load the induction details for each assigned induction
        const inductionPromises = assignedInductionIds.map(indId => 
          supabase.from('inductions').select('*').eq('id', indId).single()
        );
        const inductionResults = await Promise.all(inductionPromises);
        const assignedInductions = inductionResults
          .filter(result => !result.error)
          .map(result => result.data);
        
        console.log('📚 Loaded induction details:', assignedInductions.length);
        
        // Track completed inductions
        const completedIds = progressData
          .filter(p => p.status === 'completed')
          .map(p => p.induction_id);
        
        // Set up the board with ONLY assigned inductions
        setInductionQueue(assignedInductions);
        setCompletedInductionIds(completedIds);
        setModalAnswers({});
        setStep('inductionBoard');
        setIsNewContractor(null);
        setShowIncompleteInductionsDropdown(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load contractor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeInduction = async (induction) => {
    // This now works just like handleOpenInduction for new contractors
    // The board is already set up from handleResumeContractorSelected
    try {
      setLoading(true);
      
      // Load the progress record to get saved answers
      const progressData = await getContractorInductionProgress(contractorInfo.id);
      const progressRecord = progressData.find(p => p.induction_id === induction.id);
      const savedAnswers = progressRecord?.answers || {};
      
      // Start (or resume) the induction in the database if not already started
      await startInduction(contractorInfo.id, induction.id);
      
      setCurrentModalInduction(induction);
      setSelectedInductionId(induction.id);
      setModalStep('video');
      setModalAnswers(savedAnswers);
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load induction: ' + error.message);
    } finally {
      setLoading(false);
    }
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
    console.log('✅ BUTTON CLICKED - handleInfoContinue called');
    console.log('📋 Contractor Info:', { name: contractorInfo.name, email: contractorInfo.email, buIds: contractorInfo.selectedBusinessUnitIds, isNew: isNewContractor });
    
    if (!contractorInfo.name?.trim() || !contractorInfo.email?.trim()) {
      console.error('❌ Missing name or email');
      Alert.alert('Error', 'Please enter name and email');
      return;
    }
    if (!contractorInfo.companyId) {
      console.error('❌ Missing company');
      Alert.alert('Error', 'Please select a company');
      return;
    }
    const selectedBUs = contractorInfo.selectedBusinessUnitIds || [];
    if (selectedBUs.length === 0) {
      console.error('❌ No business units selected');
      Alert.alert('Error', 'Please select at least one business unit');
      return;
    }

    try {
      console.log('🚀 Starting induction load for BUs:', selectedBUs);
      setLoading(true);
      
      // If new contractor, create them first
      let contractorId = contractorInfo.id;
      if (isNewContractor && !contractorId) {
        console.log('📝 Creating new contractor...');
        const selectedSites = contractorInfo.selectedSiteIds || [];
        const newContractor = await createContractor({
          name: contractorInfo.name,
          email: contractorInfo.email,
          phone: contractorInfo.phone,
          company_id: contractorInfo.companyId,
          business_unit_ids: selectedBUs,
          site_ids: selectedSites,
          service_ids: [],
        });
        contractorId = newContractor.id;
        setContractorInfo({ ...contractorInfo, id: contractorId });
        console.log('✅ Contractor created:', contractorId);
      } else {
        console.log('♻️ Using existing contractor:', contractorId);
      }

      // Get inductions for all selected business units
      let allInductionsData = [];
      for (const buId of selectedBUs) {
        const inductionsForBU = await getInductionsByBusinessUnit(buId);
        console.log('📚 Got inductions for BU', buId, ':', inductionsForBU?.length || 0);
        if (Array.isArray(inductionsForBU)) {
          allInductionsData = [...allInductionsData, ...inductionsForBU];
        }
      }

      console.log('📊 Total inductions loaded:', allInductionsData.length);

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

      console.log('📋 Separated: Compulsory:', compulsory.length, 'Optional:', optional.length);

      setCompulsoryInductions(compulsory);
      setOptionalInductions(optional);
      setAllInductions(uniqueInductions);
      setSelectedOptionalIds([]);
      
      // Check for existing inductions in progress
      const existingProgress = await getContractorInductionProgress(contractorId);
      console.log('🔍 Existing progress records:', existingProgress?.length || 0);
      
      if (existingProgress && existingProgress.length > 0) {
        const inProgressInductions = existingProgress.filter(p => p.status === 'in_progress');
        if (inProgressInductions.length > 0) {
          console.log('⏸️ Found', inProgressInductions.length, 'inductions in progress - offering to resume');
          setLoading(false);
          
          // Show dialog asking if they want to resume
          Alert.alert(
            'Resume Inductions?',
            `You have ${inProgressInductions.length} induction(s) in progress. Do you want to resume where you left off?`,
            [
              {
                text: 'Start Over',
                onPress: () => {
                  console.log('🔄 User chose to start over');
                  setStep('inductionsList');
                },
              },
              {
                text: 'Resume',
                onPress: () => {
                  console.log('↩️ User chose to resume');
                  // Load the in-progress inductions and continue
                  const resumeInductionIds = new Set(inProgressInductions.map(p => p.induction_id));
                  const resumeQueue = uniqueInductions.filter(ind => resumeInductionIds.has(ind.id));
                  setCompletedInductionIds(
                    existingProgress
                      .filter(p => p.status === 'completed')
                      .map(p => p.induction_id)
                  );
                  setInductionQueue(resumeQueue);
                  setStep('inductionBoard');
                },
              },
            ]
          );
          return;
        }
      }
      
      console.log('✅ Ready to continue to inductions list');
      setLoading(false);
      setStep('inductionsList');
      
    } catch (err) {
      console.error('❌ ERROR in handleInfoContinue:', err);
      setLoading(false);
      Alert.alert('Error', 'Failed to load inductions: ' + err.message);
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

    setLoading(true);
    try {
      // Build queue: company-wide inductions first (site_id = null), then site-specific (site_id != null)
      const selectedOptional = optionalInductions.filter(ind => selectedOptionalIds.includes(ind.id));
      const allInductions = [...compulsoryInductions, ...selectedOptional];
      
      // Sort so company-wide (site_id = null) come first, then site-specific (site_id != null)
      const sortedQueue = allInductions.sort((a, b) => {
        const aIsCompanyWide = a.site_id === null ? 0 : 1;
        const bIsCompanyWide = b.site_id === null ? 0 : 1;
        return aIsCompanyWide - bIsCompanyWide;
      });
      
      // Create progress records for ALL inductions upfront
      // Use Promise.allSettled to continue even if some fail (unlikely to happen)
      const promises = sortedQueue.map(induction => 
        startInduction(contractorInfo.id, induction.id).catch(err => {
          console.error('Error starting induction', induction.id, ':', err);
          return null; // Continue anyway
        })
      );
      
      await Promise.all(promises);
      
      setInductionQueue(sortedQueue);
      setCompletedInductionIds([]); // Reset completed
      setModalAnswers({}); // Reset modal answers
      
      // Go to board view instead of sequential
      setStep('inductionBoard');
    } catch (err) {
      Alert.alert('Error', 'Failed to start inductions: ' + err.message);
    } finally {
      setLoading(false);
    }
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
        {renderHeader('Contractor Induction', onCancel, '✕')}

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
            onPress={() => {
              setIsNewContractor('returning');
              setReturningFilterCompanyId('');
              setReturningFilterBUId('');
              setReturningFilteredContractors(contractors);
            }}
            style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 20, borderLeftWidth: 4, borderLeftColor: '#10B981' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981', marginBottom: 8 }}>↩️ Returning Contractor</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>I need to redo my induction</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLoadIncompleteInductions}
            style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 20, marginTop: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#D97706', marginBottom: 8 }}>⏸️ Resume Saved Induction</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>Complete my induction in progress</Text>
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

  // STEP 0: Choose contractor to resume induction for
  if (step === 'info' && isNewContractor === 'choose-contractor-for-resume') {
    return (
      <View style={styles.container}>
        {renderHeader('Select Contractor - Resume', () => setIsNewContractor(null))}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            Which contractor would you like to resume an induction for?
          </Text>

          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8 }}>
            <ScrollView style={{ maxHeight: 400 }}>
              {contractors.map(contractor => (
                <TouchableOpacity
                  key={contractor.id}
                  onPress={() => handleResumeContractorSelected(contractor.id)}
                  style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>{contractor.name}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{contractor.email}</Text>
                  </View>
                  {contractor.incompleteCount > 0 && (
                    <View style={{ backgroundColor: '#FCD34D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#78350F' }}>
                        {contractor.incompleteCount} saved
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  }

  // STEP 0: Choose incomplete induction to resume
  if (step === 'info' && isNewContractor === 'resume') {
    return (
      <View style={styles.container}>
        {renderHeader('Resume Induction', () => {
          setIsNewContractor(null);
          setIncompleteInductions([]);
          setShowIncompleteInductionsDropdown(false);
        })}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            {contractorInfo.name} has {incompleteInductions.length} saved induction{incompleteInductions.length !== 1 ? 's' : ''}. Which would you like to resume?
          </Text>

          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8 }}>
            <ScrollView style={{ maxHeight: 400 }}>
              {incompleteInductions.map(progress => (
                <TouchableOpacity
                  key={progress.id}
                  onPress={() => handleResumeInduction(progress)}
                  style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>
                    {progress.inductions?.induction_name || 'Induction'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    Last saved: {new Date(progress.updated_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  }

  // RETURNING CONTRACTOR FILTER SCREEN - Select contractor to redo induction
  if (step === 'info' && isNewContractor === 'returning') {
    const filteredList = returningFilteredContractors.filter(contractor => {
      const matchesCompany = !returningFilterCompanyId || contractor.company_id === returningFilterCompanyId;
      const matchesBU = !returningFilterBUId || (contractor.business_unit_ids && contractor.business_unit_ids.includes(returningFilterBUId));
      return matchesCompany && matchesBU;
    });

    return (
      <View style={styles.container}>
        {renderHeader('Select Contractor - Redo', () => setIsNewContractor(null))}

        <View style={{ flex: 1, padding: 16 }}>
          {/* Business Unit Filter */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
            Filter by Business Unit
          </Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 12,
              marginBottom: 4,
              backgroundColor: returningFilterBUId ? '#E0E7FF' : '#F9FAFB',
            }}
            onPress={() => setShowReturningBUDropdown(!showReturningBUDropdown)}
          >
            <Text style={{ color: returningFilterBUId ? '#3B82F6' : '#6B7280', fontSize: 14, fontWeight: '500' }}>
              {returningFilterBUId 
                ? businessUnits.find(bu => bu.id === returningFilterBUId)?.name || 'Select BU'
                : 'All Business Units'}
            </Text>
          </TouchableOpacity>

          {showReturningBUDropdown && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, maxHeight: 150 }}>
              <ScrollView>
                <TouchableOpacity
                  onPress={() => {
                    setReturningFilterBUId('');
                    setShowReturningBUDropdown(false);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                >
                  <Text style={{ color: '#1F2937', fontSize: 13 }}>All Business Units</Text>
                </TouchableOpacity>
                {businessUnits.map(bu => (
                  <TouchableOpacity
                    key={bu.id}
                    onPress={() => {
                      setReturningFilterBUId(bu.id);
                      setShowReturningBUDropdown(false);
                    }}
                    style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  >
                    <Text style={{ color: '#1F2937', fontSize: 13 }}>{bu.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Company Filter */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8, marginTop: 8 }}>
            Filter by Company
          </Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 12,
              marginBottom: 4,
              backgroundColor: returningFilterCompanyId ? '#E0E7FF' : '#F9FAFB',
            }}
            onPress={() => setShowReturningCompanyDropdown(!showReturningCompanyDropdown)}
          >
            <Text style={{ color: returningFilterCompanyId ? '#3B82F6' : '#6B7280', fontSize: 14, fontWeight: '500' }}>
              {returningFilterCompanyId 
                ? companies.find(c => c.id === returningFilterCompanyId)?.name || 'Select Company'
                : 'All Companies'}
            </Text>
          </TouchableOpacity>

          {showReturningCompanyDropdown && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, maxHeight: 150 }}>
              <ScrollView>
                <TouchableOpacity
                  onPress={() => {
                    setReturningFilterCompanyId('');
                    setShowReturningCompanyDropdown(false);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                >
                  <Text style={{ color: '#1F2937', fontSize: 13 }}>All Companies</Text>
                </TouchableOpacity>
                {companies.map(company => (
                  <TouchableOpacity
                    key={company.id}
                    onPress={() => {
                      setReturningFilterCompanyId(company.id);
                      setShowReturningCompanyDropdown(false);
                    }}
                    style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  >
                    <Text style={{ color: '#1F2937', fontSize: 13 }}>{company.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Contractors List */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8, marginTop: 12 }}>
            Contractors ({filteredList.length})
          </Text>

          <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' }}>
            {filteredList.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No contractors found</Text>
              </View>
            ) : (
              <ScrollView>
                {filteredList.map(contractor => (
                  <TouchableOpacity
                    key={contractor.id}
                    onPress={() => handleSelectExistingContractor(contractor.id)}
                    style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1F2937' }}>{contractor.name}</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{contractor.email}</Text>
                    {contractor.company_id && (
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        {companies.find(c => c.id === contractor.company_id)?.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    );
  }

  // STEP 1: INFO - Fill in contractor details
  if (step === 'info' && isNewContractor !== null && isNewContractor !== 'choose-contractor-for-resume' && isNewContractor !== 'resume' && isNewContractor !== 'returning') {
    return (
      <View style={styles.container}>
        {renderHeader(isNewContractor ? 'Your Information' : 'Review Information', () => { setIsNewContractor(null); setShowContractorDropdown(false); })}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {isNewContractor && (
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, fontStyle: 'italic' }}>
              Please fill in your details to get started
            </Text>
          )}
          {!isNewContractor && (
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, fontStyle: 'italic' }}>
              Review and update your information if needed, then select inductions to redo
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

          <View style={{ marginTop: 24, backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={handleInfoContinue}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Continue</Text>
            </TouchableOpacity>
          </View>

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
        {renderHeader('Select Inductions', () => setStep('info'))}

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

          <View style={{ marginTop: 24, marginBottom: 40 }}>
            <TouchableOpacity 
              style={{ backgroundColor: '#3B82F6', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }} 
              onPress={handleStartInductions}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                Start Inductions ({selectedOptionalIds.length + compulsoryInductions.length})
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // STEP 3: INDUCTION BOARD - Dashboard view of all inductions
  if (step === 'inductionBoard') {
    const isAllCompulsoryDone = compulsoryInductions.every(ind => completedInductionIds.includes(ind.id));
    
    const handleOpenInduction = async (induction) => {
      try {
        setLoading(true);
        
        // Load any saved answers for THIS induction only (faster query)
        const progressRecord = await getInductionProgress(contractorInfo.id, induction.id);
        const savedAnswers = progressRecord?.answers || {};
        
        // Normalize the induction data to ensure correct answers match question type
        const normalizedInduction = { ...induction };
        for (let i = 1; i <= 3; i++) {
          const qType = `question_${i}_type`;
          const qCorrect = `question_${i}_correct_answer`;
          
          // For single-select, ensure it's a number
          if ((normalizedInduction[qType] || 'single-select') === 'single-select') {
            if (Array.isArray(normalizedInduction[qCorrect])) {
              normalizedInduction[qCorrect] = normalizedInduction[qCorrect][0] ?? 0;
            } else if (typeof normalizedInduction[qCorrect] !== 'number') {
              normalizedInduction[qCorrect] = 0;
            }
          } else {
            // For multi-select, ensure it's an array
            if (typeof normalizedInduction[qCorrect] === 'number') {
              normalizedInduction[qCorrect] = [normalizedInduction[qCorrect]];
            } else if (!Array.isArray(normalizedInduction[qCorrect])) {
              normalizedInduction[qCorrect] = [];
            }
          }
        }
        
        // Start the induction in the database if not already started
        await startInduction(contractorInfo.id, induction.id);
        
        setCurrentModalInduction(normalizedInduction);
        setSelectedInductionId(induction.id);
        setModalStep('video');
        setModalAnswers(savedAnswers);
        setModalVisible(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to start induction: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    const handleCompleteInduction = async () => {
      if (!currentModalInduction || !contractorInfo.id) return;
      
      try {
        setLoading(true);
        console.log('🏁 Completing induction:', currentModalInduction.id);
        
        // Save answers if there are any
        if (Object.keys(modalAnswers).length > 0) {
          console.log('💾 Saving answers before completion...', modalAnswers);
          try {
            await saveInductionAnswers(contractorInfo.id, currentModalInduction.id, modalAnswers);
          } catch (savErr) {
            // Log but don't block completion - answers might already be saved
            console.warn('⚠️ Could not save answers, continuing with completion:', savErr.message);
          }
        }
        
        // Mark as completed in database
        console.log('📝 Marking induction as completed...');
        await completeInduction(contractorInfo.id, currentModalInduction.id);
        console.log('✅ Induction marked as completed');
        
        // Update local state
        setCompletedInductionIds([...completedInductionIds, currentModalInduction.id]);
        
        // Close modal and return to kiosk
        setModalVisible(false);
        Alert.alert('Success', 'Induction completed!', [
          {
            text: 'OK',
            onPress: () => {
              setCurrentModalInduction(null);
              setModalAnswers({});
              onCancel(); // Go back to kiosk
            }
          }
        ]);
      } catch (error) {
        console.error('❌ Error completing induction:', error);
        Alert.alert('Error', 'Failed to complete induction: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <View style={styles.container}>
        {renderHeader('Inductions', () => setStep('inductionsList'))}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            Progress: {completedInductionIds.length}/{inductionQueue.length} completed
          </Text>

          <View style={{ gap: 12, marginBottom: 24 }}>
            {inductionQueue
              .map(induction => {
              const isCompleted = completedInductionIds.includes(induction.id);
              const isCompulsory = compulsoryInductions.some(ind => ind.id === induction.id);
              
              return (
                <TouchableOpacity
                  key={induction.id}
                  onPress={() => !isCompleted && handleOpenInduction(induction)}
                  disabled={isCompleted}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: isCompleted ? '#D1FAE5' : '#F9FAFB',
                    borderLeftWidth: 4,
                    borderLeftColor: isCompleted ? '#10B981' : (isCompulsory ? '#DC2626' : '#3B82F6'),
                    opacity: isCompleted ? 0.7 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                        {induction.induction_name}
                        {induction.subsection_name && ` - ${induction.subsection_name}`}
                      </Text>
                      {isCompulsory && (
                        <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: '500' }}>
                          REQUIRED
                        </Text>
                      )}
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      {isCompleted ? (
                        <Text style={{ fontSize: 20 }}>✅</Text>
                      ) : (
                        <Text style={{ fontSize: 14, color: '#9CA3AF' }}>→</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Show completion button ONLY when ALL inductions are done (no remaining ones) */}
          {inductionQueue.filter(ind => !completedInductionIds.includes(ind.id)).length === 0 && (
            <TouchableOpacity
              style={{ backgroundColor: '#10B981', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
              onPress={() => onCancel()} 
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                All Inductions Complete - Return to Kiosk
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Induction Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <View style={{ flex: 1, backgroundColor: 'white', marginTop: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              {currentModalInduction && (
                <>
                  {/* Header */}
                  <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                      {currentModalInduction.induction_name}
                      {currentModalInduction.subsection_name && ` - ${currentModalInduction.subsection_name}`}
                    </Text>
                  </View>

                  {/* Content */}
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                    {modalStep === 'video' && (
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
                          Video
                        </Text>
                        {currentModalInduction.video_url && Platform.OS === 'web' ? (
                          <iframe
                            src={getYouTubeEmbedUrl(currentModalInduction.video_url)}
                            style={{
                              width: '100%',
                              height: 250,
                              borderRadius: 8,
                              border: 'none',
                              marginBottom: 16,
                            }}
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : currentModalInduction.video_url ? (
                          <WebView
                            source={{ uri: getYouTubeEmbedUrl(currentModalInduction.video_url) }}
                            style={{ height: 250, marginBottom: 16, borderRadius: 8 }}
                            allowsFullscreenVideo
                          />
                        ) : (
                          <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                            <Text style={{ color: '#6B7280', textAlign: 'center' }}>No video for this induction</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={{ backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
                          onPress={() => setModalStep(currentModalInduction.question_1_text ? 'questions' : 'complete')}
                        >
                          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                            Next: {currentModalInduction.question_1_text ? 'Questions' : 'Complete'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {modalStep === 'questions' && (
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 16 }}>
                          Questions
                        </Text>
                        
                        {currentModalInduction.question_1_text && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                              {currentModalInduction.question_1_text}
                            </Text>
                            {(() => {
                              const qType = currentModalInduction.question_1_type || 'single-select';
                              const isSingleSelect = qType === 'single-select';
                              const selectedAnswers = modalAnswers.q1 ?? (isSingleSelect ? null : []);
                              const correctAnswer = currentModalInduction.question_1_correct_answer;
                              const options = currentModalInduction.question_1_options;
                              
                              console.log('🔍 Q1 Full Debug:', { 
                                qType, 
                                isSingleSelect,
                                selectedAnswers,
                                correctAnswer,
                                options,
                                optionsLen: options?.length,
                                optionsType: typeof options,
                              });
                              
                              return (
                                <View style={{ gap: 6 }}>
                                  {Array.isArray(options) && options.map((option, idx) => {
                                    const isSelected = isSingleSelect 
                                      ? selectedAnswers === idx 
                                      : Array.isArray(selectedAnswers) && selectedAnswers.includes(idx);
                                    
                                    console.log(`   Option ${idx}: "${option}", isSelected=${isSelected}, selectedAnswers=${selectedAnswers}`);
                                    
                                    if (isSingleSelect) {
                                      return (
                                        <TouchableOpacity
                                          key={idx}
                                          onPress={() => {
                                            console.log(`   ➡️ User clicked option ${idx}`);
                                            setModalAnswers({ ...modalAnswers, q1: idx });
                                          }}
                                          style={{
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderRadius: 6,
                                            backgroundColor: isSelected ? '#E0E7FF' : '#F3F4F6',
                                            borderLeftWidth: 3,
                                            borderLeftColor: isSelected ? '#3B82F6' : '#E5E7EB',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <View style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 8,
                                            borderWidth: 2,
                                            borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
                                            backgroundColor: isSelected ? '#3B82F6' : 'white',
                                            marginRight: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}>
                                            {isSelected && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>•</Text>}
                                          </View>
                                          <Text style={{ color: '#1F2937', fontSize: 13, flex: 1 }}>{option}</Text>
                                        </TouchableOpacity>
                                      );
                                    } else {
                                      return (
                                        <TouchableOpacity
                                          key={idx}
                                          onPress={() => {
                                            const current = Array.isArray(selectedAnswers) ? [...selectedAnswers] : [];
                                            if (current.includes(idx)) {
                                              setModalAnswers({ ...modalAnswers, q1: current.filter(i => i !== idx) });
                                            } else {
                                              current.push(idx);
                                              setModalAnswers({ ...modalAnswers, q1: current });
                                            }
                                          }}
                                          style={{
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderRadius: 6,
                                            backgroundColor: isSelected ? '#DCFCE7' : '#F3F4F6',
                                            borderLeftWidth: 3,
                                            borderLeftColor: isSelected ? '#10B981' : '#E5E7EB',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <View style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 3,
                                            borderWidth: 2,
                                            borderColor: isSelected ? '#10B981' : '#D1D5DB',
                                            backgroundColor: isSelected ? '#10B981' : 'white',
                                            marginRight: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}>
                                            {isSelected && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                                          </View>
                                          <Text style={{ color: '#1F2937', fontSize: 13, flex: 1 }}>{option}</Text>
                                        </TouchableOpacity>
                                      );
                                    }
                                  })}
                                </View>
                              );
                            })()}
                          </View>
                        )}

                        {currentModalInduction.question_2_text && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                              {currentModalInduction.question_2_text}
                            </Text>
                            {(() => {
                              const qType = currentModalInduction.question_2_type || 'single-select';
                              const isSingleSelect = qType === 'single-select';
                              const selectedAnswers = modalAnswers.q2 ?? (isSingleSelect ? null : []);
                              const correctAnswer = currentModalInduction.question_2_correct_answer;
                              const options = currentModalInduction.question_2_options;
                              
                              console.log('🔍 Q2 Full Debug:', { 
                                qType, 
                                isSingleSelect,
                                selectedAnswers,
                                correctAnswer,
                                options,
                                optionsLen: options?.length,
                              });
                              
                              return (
                                <View style={{ gap: 6 }}>
                                  {Array.isArray(options) && options.map((option, idx) => {
                                    const isSelected = isSingleSelect 
                                      ? selectedAnswers === idx 
                                      : Array.isArray(selectedAnswers) && selectedAnswers.includes(idx);
                                    
                                    console.log(`   Q2 Option ${idx}: "${option}", isSelected=${isSelected}`);
                                    
                                    if (isSingleSelect) {
                                      return (
                                        <TouchableOpacity
                                          key={idx}
                                          onPress={() => {
                                            console.log(`   ➡️ User clicked Q2 option ${idx}`);
                                            setModalAnswers({ ...modalAnswers, q2: idx });
                                          }}
                                          style={{
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderRadius: 6,
                                            backgroundColor: isSelected ? '#E0E7FF' : '#F3F4F6',
                                            borderLeftWidth: 3,
                                            borderLeftColor: isSelected ? '#3B82F6' : '#E5E7EB',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <View style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 8,
                                            borderWidth: 2,
                                            borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
                                            backgroundColor: isSelected ? '#3B82F6' : 'white',
                                            marginRight: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}>
                                            {isSelected && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>•</Text>}
                                          </View>
                                          <Text style={{ color: '#1F2937', fontSize: 13, flex: 1 }}>{option}</Text>
                                        </TouchableOpacity>
                                      );
                                    } else {
                                      return (
                                        <TouchableOpacity
                                          key={idx}
                                          onPress={() => {
                                            console.log(`   ➡️ User clicked Q2 option ${idx} (multi-select)`);
                                            const current = Array.isArray(selectedAnswers) ? [...selectedAnswers] : [];
                                            if (current.includes(idx)) {
                                              setModalAnswers({ ...modalAnswers, q2: current.filter(i => i !== idx) });
                                            } else {
                                              current.push(idx);
                                              setModalAnswers({ ...modalAnswers, q2: current });
                                            }
                                          }}
                                          style={{
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderRadius: 6,
                                            backgroundColor: isSelected ? '#DCFCE7' : '#F3F4F6',
                                            borderLeftWidth: 3,
                                            borderLeftColor: isSelected ? '#10B981' : '#E5E7EB',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <View style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 3,
                                            borderWidth: 2,
                                            borderColor: isSelected ? '#10B981' : '#D1D5DB',
                                            backgroundColor: isSelected ? '#10B981' : 'white',
                                            marginRight: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}>
                                            {isSelected && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                                          </View>
                                          <Text style={{ color: '#1F2937', fontSize: 13, flex: 1 }}>{option}</Text>
                                        </TouchableOpacity>
                                      );
                                    }
                                  })}
                                </View>
                              );
                            })()}
                          </View>
                        )}

                        {currentModalInduction.question_3_text && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                              {currentModalInduction.question_3_text}
                            </Text>
                            {(() => {
                              const qType = currentModalInduction.question_3_type || 'single-select';
                              const isSingleSelect = qType === 'single-select';
                              const selectedAnswers = modalAnswers.q3 ?? (isSingleSelect ? null : []);
                              const correctAnswer = currentModalInduction.question_3_correct_answer;
                              const options = currentModalInduction.question_3_options;
                              
                              console.log('🔍 Q3 Full Debug:', { 
                                qType, 
                                isSingleSelect,
                                selectedAnswers,
                                correctAnswer,
                                options,
                                optionsLen: options?.length,
                              });
                              
                              return (
                                <View style={{ gap: 6 }}>
                                  {Array.isArray(options) && options.map((option, idx) => {
                                    const isSelected = isSingleSelect 
                                      ? selectedAnswers === idx 
                                      : Array.isArray(selectedAnswers) && selectedAnswers.includes(idx);
                                    
                                    console.log(`   Q3 Option ${idx}: "${option}", isSelected=${isSelected}`);
                                    
                                    if (isSingleSelect) {
                                      return (
                                        <TouchableOpacity
                                          key={idx}
                                          onPress={() => {
                                            console.log(`   ➡️ User clicked Q3 option ${idx}`);
                                            setModalAnswers({ ...modalAnswers, q3: idx });
                                          }}
                                          style={{
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderRadius: 6,
                                            backgroundColor: isSelected ? '#E0E7FF' : '#F3F4F6',
                                            borderLeftWidth: 3,
                                            borderLeftColor: isSelected ? '#3B82F6' : '#E5E7EB',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <View style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 8,
                                            borderWidth: 2,
                                            borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
                                            backgroundColor: isSelected ? '#3B82F6' : 'white',
                                            marginRight: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}>
                                            {isSelected && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>•</Text>}
                                          </View>
                                          <Text style={{ color: '#1F2937', fontSize: 13, flex: 1 }}>{option}</Text>
                                        </TouchableOpacity>
                                      );
                                    } else {
                                      return (
                                        <TouchableOpacity
                                          key={idx}
                                          onPress={() => {
                                            console.log(`   ➡️ User clicked Q3 option ${idx} (multi-select)`);
                                            const current = Array.isArray(selectedAnswers) ? [...selectedAnswers] : [];
                                            if (current.includes(idx)) {
                                              setModalAnswers({ ...modalAnswers, q3: current.filter(i => i !== idx) });
                                            } else {
                                              current.push(idx);
                                              setModalAnswers({ ...modalAnswers, q3: current });
                                            }
                                          }}
                                          style={{
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            borderRadius: 6,
                                            backgroundColor: isSelected ? '#DCFCE7' : '#F3F4F6',
                                            borderLeftWidth: 3,
                                            borderLeftColor: isSelected ? '#10B981' : '#E5E7EB',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <View style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 3,
                                            borderWidth: 2,
                                            borderColor: isSelected ? '#10B981' : '#D1D5DB',
                                            backgroundColor: isSelected ? '#10B981' : 'white',
                                            marginRight: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}>
                                            {isSelected && <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                                          </View>
                                          <Text style={{ color: '#1F2937', fontSize: 13, flex: 1 }}>{option}</Text>
                                        </TouchableOpacity>
                                      );
                                    }
                                  })}
                                </View>
                              );
                            })()}
                          </View>
                        )}

                        <TouchableOpacity
                          style={{ backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
                          onPress={() => setModalStep('complete')}
                        >
                          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                            Next: Complete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {modalStep === 'complete' && (
                      <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981', marginBottom: 8 }}>✅</Text>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 }}>
                          Ready to Complete?
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
                          You've completed this induction. Click below to save.
                        </Text>

                        <TouchableOpacity
                          style={{ backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center' }}
                          onPress={handleCompleteInduction}
                        >
                          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                            Mark Complete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>

                  {/* Bottom Buttons */}
                  <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#64748B', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          // Save current answers to this induction
                          if (currentModalInduction) {
                            const answersToSave = Object.keys(modalAnswers).length > 0 ? modalAnswers : {};
                            console.log('💾 Saving progress for later:', currentModalInduction.id, 'answers:', answersToSave);
                            try {
                              await saveInductionProgress(contractorInfo.id, currentModalInduction.id, answersToSave);
                            } catch (savErr) {
                              console.warn('⚠️ Error saving progress, but continuing:', savErr.message);
                            }
                          }
                          Alert.alert('Success', 'Progress saved! You can continue later.', [
                            {
                              text: 'OK',
                              onPress: () => {
                                setModalVisible(false);
                                onCancel(); // Go back to kiosk
                              }
                            }
                          ]);
                        } catch (err) {
                          console.error('Save error:', err);
                          Alert.alert('Error', 'Failed to save progress: ' + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                        {loading ? 'Saving...' : 'Save for Later'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={{ backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => onCancel()} 
                    >
                      <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // OLD STEPS - Keep for now but will be replaced
  if (step === 'signature') {
    const isAllCompulsoryDone = compulsoryInductions.every(ind => completedInductionIds.includes(ind.id));
    
    if (!isAllCompulsoryDone) {
      return (
        <View style={styles.container}>
          <View style={{ backgroundColor: '#3B82F6', paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: 'white', textAlign: 'center' }}>All Required Inductions Must Be Completed</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {renderHeader('Sign & Submit', () => setStep('inductionBoard'))}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            All required inductions are complete. Please sign below to submit.
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
            Signature
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 80, paddingTop: 12 }]}
            placeholder="Type your name"
            value={signatureText}
            onChangeText={setSignatureText}
            multiline
          />

          <View style={{ gap: 8, marginTop: 24 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#10B981', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}
              onPress={async () => {
                if (!signatureText.trim()) {
                  Alert.alert('Error', 'Please sign');
                  return;
                }
                
                setLoading(true);
                try {
                  // Build service_ids from completed optional inductions
                  // (Compulsory inductions don't earn services, only optional ones do)
                  const completedInductions = inductionQueue.filter(ind => completedInductionIds.includes(ind.id));
                  
                  // Only include optional inductions as earned services
                  // Use service_id (UUID) from induction table for proper service reference
                  const serviceIds = completedInductions
                    .filter(ind => !ind.is_compulsory && ind.service_id) // Only optional inductions with service_id
                    .map(ind => ind.service_id); // Store UUID reference to service

                  // Calculate induction expiry: current date + 365 days
                  const expiryDate = new Date();
                  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                  const inductionExpiryIso = expiryDate.toISOString();

                  // Update contractor with earned services from optional inductions
                  const contractorUpdate = {
                    service_ids: serviceIds,
                    induction_expiry: inductionExpiryIso,
                    signature: signatureText, // Store signature
                  };
                  
                  await updateContractor(contractorInfo.id, contractorUpdate);

                  setStep('complete');
                } catch (err) {
                  Alert.alert('Error', 'Failed to submit: ' + err.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!signatureText.trim() || loading}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {loading ? 'Submitting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: '#64748B',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={async () => {
                setLoading(true);
                try {
                  // Save progress for each completed induction without marking as complete
                  for (const completedId of completedInductionIds) {
                    const induction = inductionQueue.find(ind => ind.id === completedId);
                    if (induction && modalAnswers[completedId]) {
                      await saveInductionProgress(contractorInfo.id, induction.id, modalAnswers[completedId]);
                    }
                  }
                  Alert.alert('Success', 'Progress saved! You can continue later.');
                  setStep('inductionsList'); // Go back to list so they can exit
                } catch (err) {
                  Alert.alert('Error', 'Failed to save progress: ' + err.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {loading ? 'Saving...' : 'Save for Later'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === 'complete') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 32, marginBottom: 16 }}>✅</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#10B981', marginBottom: 8, textAlign: 'center' }}>
          All Done!
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
          Your inductions have been submitted successfully.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}
          onPress={onComplete}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // STEP 3: VIDEO - OLD (keeping for reference, will be removed)
  if (step === 'video') {
    const getYoutubeEmbedUrl = (url) => {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
    };

    const embedUrl = currentInduction?.video_url ? getYoutubeEmbedUrl(currentInduction.video_url) : null;

    return (
      <View style={styles.container}>
        {renderHeader(
          `${currentInduction.induction_name}${currentInduction.subsection_name ? ` - ${currentInduction.subsection_name}` : ''}`,
          () => { setStep('inductionsList'); setCurrentInductionIndex(0); }
        )}

        <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
          {embedUrl ? (
            Platform.OS === 'web' ? (
              <iframe
                src={embedUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allowFullScreen
                title="Induction Video"
              />
            ) : (
              <WebView
                source={{ uri: embedUrl }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
              />
            )
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#6B7280' }}>No video for this induction</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
          <TouchableOpacity
            style={{ backgroundColor: '#3B82F6', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginBottom: 8 }}
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
      { num: 1, text: currentInduction.question_1_text, options: currentInduction.question_1_options, correct: currentInduction.question_1_correct_answer, type: currentInduction.question_1_type || 'single-select' },
      { num: 2, text: currentInduction.question_2_text, options: currentInduction.question_2_options, correct: currentInduction.question_2_correct_answer, type: currentInduction.question_2_type || 'single-select' },
      { num: 3, text: currentInduction.question_3_text, options: currentInduction.question_3_options, correct: currentInduction.question_3_correct_answer, type: currentInduction.question_3_type || 'single-select' },
    ].filter(q => q.text?.trim());

    return (
      <View style={styles.container}>
        {renderHeader('Questions', () => setStep('video'))}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {questions.map(q => {
            const isSingleSelect = q.type === 'single-select';
            const selectedAnswers = answers[`q${q.num}`] || (isSingleSelect ? null : []);
            const isAnswered = isSingleSelect ? selectedAnswers !== null && selectedAnswers !== undefined : Array.isArray(selectedAnswers) && selectedAnswers.length > 0;
            
            return (
              <View key={q.num} style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
                  Q{q.num}: {q.text} {isAnswered && isSingleSelect && <Text style={{ color: '#10B981', fontSize: 12 }}>✓</Text>}
                </Text>
                {Array.isArray(q.options) && q.options.map((option, idx) => {
                  const isSelected = isSingleSelect 
                    ? selectedAnswers === idx 
                    : Array.isArray(selectedAnswers) && selectedAnswers.includes(idx);
                  
                  if (isSingleSelect) {
                    // Single-select: radio button style
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setAnswers({ ...answers, [`q${q.num}`]: idx })}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#E0E7FF' : '#F9FAFB',
                          marginBottom: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: isSelected ? '#3B82F6' : '#E5E7EB',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
                          backgroundColor: isSelected ? '#3B82F6' : 'white',
                          marginRight: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isSelected && <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>•</Text>}
                        </View>
                        <Text style={{ color: '#1F2937', fontWeight: isSelected ? '600' : '400', flex: 1 }}>
                          {String.fromCharCode(65 + idx)}) {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  } else {
                    // Multi-select: checkbox style
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          const current = Array.isArray(selectedAnswers) ? [...selectedAnswers] : [];
                          if (current.includes(idx)) {
                            setAnswers({ ...answers, [`q${q.num}`]: current.filter(i => i !== idx) });
                          } else {
                            current.push(idx);
                            setAnswers({ ...answers, [`q${q.num}`]: current });
                          }
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#DCFCE7' : '#F9FAFB',
                          marginBottom: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: isSelected ? '#10B981' : '#E5E7EB',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: isSelected ? '#10B981' : '#D1D5DB',
                          backgroundColor: isSelected ? '#10B981' : 'white',
                          marginRight: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isSelected && <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                        </View>
                        <Text style={{ color: '#1F2937', fontWeight: isSelected ? '600' : '400', flex: 1 }}>
                          {String.fromCharCode(65 + idx)}) {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                })}
              </View>
            );
          })}

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
        {renderHeader('Confirm', () => setStep(hasQuestions ? 'questions' : 'video'))}

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

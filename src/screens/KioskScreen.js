import React, { useState, useEffect, createContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { checkInContractor, checkInVisitor, checkOut, getSignedInPeople } from '../api/signIns';
import { listContractorsBySite } from '../api/contractors';
import { listSites } from '../api/sites';
import { getVisitorInduction } from '../api/visitorInductions';
import { listPermits } from '../api/permits';
import ContractorInductionScreen from './ContractorInductionScreen';
import KioskWelcome from './kiosk/KioskWelcome';
import KioskContractorSignIn from './kiosk/KioskContractorSignIn';
import KioskVisitorInduction from './kiosk/KioskVisitorInduction';
import KioskVisitorSignIn from './kiosk/KioskVisitorSignIn';
import KioskSignOut from './kiosk/KioskSignOut';
import KioskPermits from './kiosk/KioskPermits';

// Create context for sharing data between kiosk screens
export const KioskContext = createContext({});

// Format name to proper title case (e.g., "JOHN DOE" → "John Doe", "john doe" → "John Doe")
const formatNameToTitleCase = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const KioskScreen = ({ onViewPermits }) => {
  // State
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, visitor-induction, visitor-signin, contractor-signin, signout, permits-kiosk
  const [site, setSite] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [businessUnitId, setBusinessUnitId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(false); // For development/testing
  
  // For contractor search
  const [contractorSearch, setContractorSearch] = useState('');
  const [filteredContractors, setFilteredContractors] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState(null);
  
  // For visitor checkin
  const [visitorName, setVisitorName] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitingPerson, setVisitingPerson] = useState('');
  const [visitorInductionContent, setVisitorInductionContent] = useState('');
  const [visitorInductionConfirmed, setVisitorInductionConfirmed] = useState(false);
  
  // For signout list
  const [signedInPeople, setSignedInPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // For permits list
  const [permits, setPermits] = useState([]);
  const [permitsLoading, setPermitsLoading] = useState(false);
  
  // For contractor induction
  const [showInductionModal, setShowInductionModal] = useState(false);

  // Initialize - detect site from subdomain
  useEffect(() => {
    const initializeKiosk = async () => {
      try {
        setLoading(true);
        
        // Get hostname
        const hostname = window.location.hostname;
        console.log('🏢 Kiosk hostname:', hostname);
        
        // Load sites
        const sitesData = await listSites();
        
        // Try to match by kiosk_subdomain
        const parts = hostname.split('.');
        const subdomain = parts[0]; // e.g., "wa-amisfield-quarry-kiosk"
        let matchingSite = sitesData.find(s => s.kiosk_subdomain === subdomain);
        
        // Fallback for development/testing: use first site if on localhost or Vercel
        if (!matchingSite && (hostname.includes('localhost') || hostname.includes('vercel.app'))) {
          console.warn('⚠️ No matching site for subdomain, using first site for testing');
          matchingSite = sitesData[0];
          setTestMode(true);
        }
        
        if (matchingSite) {
          setSite(matchingSite);
          setSiteId(matchingSite.id);
          setBusinessUnitId(matchingSite.business_unit_id);
          console.log(`${testMode ? '⚠️ TEST MODE' : '✅'} Kiosk site: ${matchingSite.name}`);
          
          // Load site-specific data
          const contractorsData = await listContractorsBySite(matchingSite.id);
          setContractors(contractorsData);
          
          // Load visitor induction content
          const inductionResult = await getVisitorInduction(matchingSite.id);
          if (inductionResult.success) {
            setVisitorInductionContent(inductionResult.data.content);
          }
          
          // Load current signins
          loadSignedInPeople();
        } else {
          Alert.alert('Error', 'Could not detect site. Please use a kiosk subdomain or try from localhost.');
          console.error('❌ No site found for subdomain:', subdomain);
        }
      } catch (error) {
        console.error('Error initializing kiosk:', error);
        Alert.alert('Error', 'Failed to initialize kiosk');
      } finally {
        setLoading(false);
      }
    };
    
    initializeKiosk();
  }, []);

  const loadSignedInPeople = async () => {
    try {
      if (!siteId) return;
      const result = await getSignedInPeople(siteId);
      if (result.success && result.data) {
        setSignedInPeople(result.data);
      } else {
        setSignedInPeople([]);
      }
    } catch (error) {
      console.error('Error loading signed in people:', error);
      setSignedInPeople([]);
    }
  };

  // Load permits when switching to permits screen
  useEffect(() => {
    const loadSitePermits = async () => {
      try {
        if (!siteId) return;
        const allPermits = await listPermits();
        // Filter permits for the current site
        const sitePermits = allPermits.filter(p => p.site_id === siteId);
        setPermits(sitePermits);
        setPermitsLoading(false);
      } catch (error) {
        console.error('Error loading permits:', error);
        setPermitsLoading(false);
      }
    };

    if (permitsLoading && currentScreen === 'permits-kiosk') {
      loadSitePermits();
    }
  }, [permitsLoading, currentScreen, siteId]);

  const handleContractorSearch = (text) => {
    setContractorSearch(text);
    if (text.trim().length > 0) {
      const filtered = contractors.filter(c => 
        c.name.toLowerCase().includes(text.toLowerCase()) ||
        c.email.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredContractors(filtered);
    } else {
      setFilteredContractors([]);
    }
  };

  const handleCheckInContractor = async () => {
    if (!selectedContractor) {
      Alert.alert('Error', 'Please select a contractor');
      return;
    }
    
    try {
      const result = await checkInContractor(selectedContractor.id, siteId, businessUnitId);
      
      if (result.success) {
        Alert.alert('Success', `${selectedContractor.name} signed in successfully`);
        // Clear all contractor form state
        setSelectedContractor(null);
        setContractorSearch('');
        setFilteredContractors([]);
        setCurrentScreen('welcome');
        loadSignedInPeople();
      } else {
        Alert.alert('Error', result.error || 'Check-in failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      console.error('Check-in error:', error);
    }
  };

  const handleCheckInVisitor = async () => {
    if (!visitorName.trim() || !visitorCompany.trim() || !visitorPhone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      const formattedName = formatNameToTitleCase(visitorName);
      const result = await checkInVisitor(formattedName, visitorCompany, siteId, businessUnitId, visitorPhone);
      
      if (result.success) {
        Alert.alert('Success', `${formattedName} signed in successfully`);
        // Clear all visitor form state
        setVisitorName('');
        setVisitorCompany('');
        setVisitorPhone('');
        setVisitingPerson('');
        setCurrentScreen('welcome');
        loadSignedInPeople();
      } else {
        Alert.alert('Error', result.error || 'Check-in failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      console.error('Visitor check-in error:', error);
    }
  };

  const handleSignOut = async () => {
    if (!selectedPerson) {
      Alert.alert('Error', 'Please select a person to sign out');
      return;
    }
    
    try {
      await checkOut(selectedPerson.id);
      Alert.alert('Success', `${selectedPerson.name} signed out successfully`);
      setCurrentScreen('welcome');
      setSelectedPerson(null);
      loadSignedInPeople();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading Kiosk...</Text>
      </View>
    );
  }

  if (!site) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: Could not detect site</Text>
      </View>
    );
  }

  // Return the main component with floating Permits button
  // The permits button floats at the bottom-right and is visible on all screens
  const kioskContextValue = {
    site,
    siteId,
    businessUnitId,
    contractors,
    styles,
    testMode,
  };

  return (
    <BrowserRouter>
      <View style={{ flex: 1, position: 'relative' }}>
        <KioskContext.Provider value={kioskContextValue}>
          <Routes>
            {/* Default route - welcome screen */}
            <Route path="/" element={<KioskWelcome />} />
            
            {/* Sign-in routes */}
            <Route path="/sign-in/contractor" element={<KioskContractorSignIn />} />
            <Route path="/sign-in/visitor" element={<KioskVisitorInduction />} />
            
            {/* Sign-out route */}
            <Route path="/sign-out" element={<KioskSignOut />} />
            
            {/* Permits route */}
            <Route path="/permits" element={<KioskPermits />} />
            
            {/* Catch-all - default to welcome */}
            <Route path="*" element={<KioskWelcome />} />
          </Routes>
        </KioskContext.Provider>
        
        {/* Floating Permits button - visible on all screens except permits */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 30,
            right: 20,
            backgroundColor: '#10B981',
            padding: 16,
            borderRadius: 50,
            elevation: 10,
            zIndex: 1000,
            width: 70,
            height: 70,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
          }}
          onPress={() => {
            // Navigate to permits using window.history or router
            window.location.hash = '/permits';
          }}
        >
          <Text style={{ fontSize: 32 }}>📋</Text>
          <Text style={{ fontSize: 10, color: 'white', marginTop: 2, fontWeight: '600' }}>Permits</Text>
        </TouchableOpacity>
      </View>
    </BrowserRouter>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  siteName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    fontSize: 24,
    color: '#E0E7FF',
    marginBottom: 10,
  },
  mainContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  largeButton: {
    backgroundColor: '#3B82F6',
    padding: 24,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  largeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  contractorItem: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#D1D5DB',
  },
  contractorItemSelected: {
    borderLeftColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contractorEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  contractorCompany: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  personItem: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#D1D5DB',
  },
  personItemSelected: {
    borderLeftColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  personTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  personDetails: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 2,
  },
  selectedBox: {
    backgroundColor: '#DBEAFE',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#0C63E4',
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  selectedCompany: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  selectedDateTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  noResults: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
  // TODO: Module and permit styles for Phase 2
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 40,
  },
  inductionBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  inductionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1F2937',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxTick: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
});

export default KioskScreen;

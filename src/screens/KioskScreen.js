import React, { useState, useEffect } from 'react';
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
import { checkInContractor, checkInVisitor, checkOut, getSignedInPeople } from '../api/signIns';
import { listContractorsBySite } from '../api/contractors';
import { listSites } from '../api/sites';
import { getVisitorInduction } from '../api/visitorInductions';
import { listPermits } from '../api/permits';
import ContractorInductionScreen from './ContractorInductionScreen';

// Format name to proper title case (e.g., "JOHN DOE" → "John Doe", "john doe" → "John Doe")
const formatNameToTitleCase = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const KioskScreen = ({ onViewPermits, initialRoute }) => {
  // State
  const [currentScreen, setCurrentScreen] = useState(initialRoute || 'welcome'); // welcome, visitor-induction, visitor-signin, contractor-signin, signout, permits-kiosk, inductions, inductions-new, inductions-returning, inductions-resume
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
  const [inductionInitialRoute, setInductionInitialRoute] = useState(null);

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

  // Handle initialRoute changes from URL path detection
  useEffect(() => {
    if (initialRoute && initialRoute !== 'welcome') {
      setCurrentScreen(initialRoute);
      console.log('🔗 Route detected from URL:', initialRoute);
    }
  }, [initialRoute]);

  // Update URL when currentScreen changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        let newPath = '/';
        
        if (currentScreen === 'contractor-signin') {
          newPath = '/sign-in-contractor/';
        } else if (currentScreen === 'visitor-induction') {
          newPath = '/sign-in-visitor/';
        } else if (currentScreen === 'visitor-signin') {
          newPath = '/sign-in-visitor/';
        } else if (currentScreen === 'signout') {
          newPath = '/sign-out/';
        } else if (currentScreen === 'permits-kiosk') {
          newPath = '/permits/';
        } else if (currentScreen === 'inductions') {
          newPath = '/inductions/';
        } else if (currentScreen === 'inductions-new') {
          newPath = '/inductions/new/';
        } else if (currentScreen === 'inductions-returning') {
          newPath = '/inductions/returning/';
        } else if (currentScreen === 'inductions-resume') {
          newPath = '/inductions/resume/';
        }
        
        // Update URL without page reload
        if (window.location.pathname !== newPath) {
          window.history.pushState(null, '', newPath);
          console.log('🔗 URL updated to:', newPath);
        }
      }
    } catch (error) {
      console.log('URL update (not critical):', error);
    }
  }, [currentScreen]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      // Reload the page to ensure proper state sync with URL
      window.location.reload();
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  // Welcome Screen
  if (currentScreen === 'welcome') {
    return (
      <View style={{ ...styles.container, position: 'relative' }}>
        <View style={styles.header}>
          <Text style={styles.siteName}>{site.name}</Text>
          <Text style={styles.subtitle}>Kiosk Sign-In System</Text>
          {testMode && (
            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 8, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#991B1B', fontSize: 11, fontWeight: '600' }}>⚠️ TEST MODE</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.mainContent} scrollEnabled={false}>
          <TouchableOpacity 
            style={styles.largeButton}
            onPress={() => {
              setCurrentScreen('contractor-signin');
              setSelectedContractor(null);
              setContractorSearch('');
            }}
          >
            <Text style={styles.largeButtonText}>👷 Sign In Contractor</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.largeButton}
            onPress={() => {
              setCurrentScreen('visitor-induction');
              setVisitorInductionConfirmed(false);
              setVisitorName('');
              setVisitorCompany('');
              setVisitorPhone('');
              setVisitingPerson('');
            }}
          >
            <Text style={styles.largeButtonText}>👥 Sign In Visitor</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.largeButton}
            onPress={() => {
              setCurrentScreen('signout');
              setSelectedPerson(null);
              loadSignedInPeople();
            }}
          >
            <Text style={styles.largeButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Floating Permits button */}
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
            if (onViewPermits) {
              onViewPermits(siteId);
            }
          }}
        >
          <Text style={{ fontSize: 32 }}>📋</Text>
          <Text style={{ fontSize: 10, color: 'white', marginTop: 2, fontWeight: '600' }}>Permits</Text>
        </TouchableOpacity>

        {/* Contractor Induction Button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 30,
            left: 20,
            backgroundColor: '#A855F7',
            width: 70,
            height: 70,
            borderRadius: 35,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            zIndex: 1001,
          }}
          onPress={() => {
            console.log('🎓 Induction button pressed');
            setCurrentScreen('inductions');
          }}
        >
          <Text style={{ fontSize: 32 }}>🎓</Text>
          <Text style={{ fontSize: 9, color: 'white', marginTop: 2, fontWeight: '600' }}>Induction</Text>
        </TouchableOpacity>

        {/* Contractor Induction Modal */}
        <Modal
          visible={showInductionModal}
          animationType="slide"
          onRequestClose={() => setShowInductionModal(false)}
        >
          <ContractorInductionScreen
            styles={styles}
            onComplete={() => setShowInductionModal(false)}
            onCancel={() => setShowInductionModal(false)}
          />
        </Modal>
      </View>
    );
  }

  // Inductions Screen (fullscreen for URL routing)
  if (currentScreen === 'inductions' || currentScreen === 'inductions-new' || currentScreen === 'inductions-returning' || currentScreen === 'inductions-resume') {
    // Map screen to initial state for ContractorInductionScreen
    let inductionInitialState = null;
    if (currentScreen === 'inductions-new') {
      inductionInitialState = 'new'; // true
    } else if (currentScreen === 'inductions-returning') {
      inductionInitialState = 'returning'; // false
    } else if (currentScreen === 'inductions-resume') {
      inductionInitialState = 'resume';
    }
    
    const handleSelectInductionType = (type) => {
      if (type === 'new') {
        setCurrentScreen('inductions-new');
      } else if (type === 'returning') {
        setCurrentScreen('inductions-returning');
      } else if (type === 'resume') {
        setCurrentScreen('inductions-resume');
      }
    };
    
    const handleBackToSelection = () => {
      setCurrentScreen('inductions');
    };
    
    return (
      <ContractorInductionScreen
        styles={styles}
        initialRoute={inductionInitialState}
        onSelectInductionType={handleSelectInductionType}
        onBackToSelection={handleBackToSelection}
        onComplete={() => setCurrentScreen('welcome')}
        onCancel={() => setCurrentScreen('welcome')}
      />
    );
  }

  // Contractor Sign-In Screen
  if (currentScreen === 'contractor-signin') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In Contractor</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.label}>Search for Contractor:</Text>
          <TextInput
            style={styles.input}
            placeholder="Type contractor name or email..."
            value={contractorSearch}
            onChangeText={handleContractorSearch}
          />

          {filteredContractors.length > 0 ? (
            <FlatList
              data={filteredContractors}
              scrollEnabled={false}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.contractorItem,
                    selectedContractor?.id === item.id && styles.contractorItemSelected
                  ]}
                  onPress={() => setSelectedContractor(item)}
                >
                  <Text style={styles.contractorName}>{item.name}</Text>
                  <Text style={styles.contractorEmail}>{item.email}</Text>
                  {item.company && <Text style={styles.contractorCompany}>{item.company}</Text>}
                </TouchableOpacity>
              )}
            />
          ) : (
            contractorSearch.trim().length > 0 && (
              <Text style={styles.noResults}>No contractors found</Text>
            )
          )}

          {selectedContractor && (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedLabel}>Ready to Check In:</Text>
              <Text style={styles.selectedName}>{selectedContractor.name}</Text>
              <Text style={styles.selectedCompany}>Company: {selectedContractor.companyName || 'N/A'}</Text>
              <Text style={styles.selectedDateTime}>
                Date & Time: {new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleCheckInContractor}
              >
                <Text style={styles.submitButtonText}>✓ Check In</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Visitor Induction Screen (before sign-in form)
  if (currentScreen === 'visitor-induction') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Site Induction</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <View style={styles.inductionBox}>
            <Text style={styles.inductionText}>{visitorInductionContent}</Text>
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, visitorInductionConfirmed && styles.checkboxChecked]}
              onPress={() => setVisitorInductionConfirmed(!visitorInductionConfirmed)}
            >
              {visitorInductionConfirmed && <Text style={styles.checkboxTick}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>I have read and agree to comply with the above</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !visitorInductionConfirmed && styles.submitButtonDisabled]}
            disabled={!visitorInductionConfirmed}
            onPress={() => setCurrentScreen('visitor-signin')}
          >
            <Text style={styles.submitButtonText}>Continue to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Visitor Sign-In Screen
  if (currentScreen === 'visitor-signin') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In Visitor</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.label}>Visitor Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={visitorName}
            onChangeText={setVisitorName}
          />

          <Text style={styles.label}>Company *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your company"
            value={visitorCompany}
            onChangeText={setVisitorCompany}
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={visitorPhone}
            onChangeText={setVisitorPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Visiting Person (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Who are you visiting?"
            value={visitingPerson}
            onChangeText={setVisitingPerson}
          />

          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleCheckInVisitor}
          >
            <Text style={styles.submitButtonText}>✓ Check In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Sign-Out Screen
  if (currentScreen === 'signout') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign Out</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.label}>Select Person to Sign Out:</Text>
          {signedInPeople.length > 0 ? (
            signedInPeople.map((person) => {
              // Determine type, company, and phone
              const type = person.type || (person.contractor_id ? 'Contractor' : 'Visitor');
              const name = person.contractor_name || person.visitor_name || 'Unknown';
              const company = person.contractor_company || person.visitor_company || 'N/A';
              const phone = person.contractor_phone || person.phone_number || 'N/A';
              return (
                <TouchableOpacity
                  key={person.id}
                  style={[
                    styles.personItem,
                    selectedPerson?.id === person.id && styles.personItemSelected
                  ]}
                  onPress={() => setSelectedPerson(person)}
                >
                  <Text style={styles.personName}>{name}</Text>
                  <Text style={styles.personTime}>Checked in: {new Date(person.check_in_time).toLocaleTimeString()}</Text>
                  <Text style={styles.personDetails}>Type: {type}</Text>
                  <Text style={styles.personDetails}>Company: {company}</Text>
                  <Text style={styles.personDetails}>Phone: {phone}</Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noResults}>No one currently signed in</Text>
          )}

          {selectedPerson && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSignOut}
            >
              <Text style={styles.submitButtonText}>✓ Sign Out</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // Permits Kiosk View Screen - matches main dashboard
  if (currentScreen === 'permits-kiosk') {
    if (permitsLoading) {
      return (
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading Permits...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Permits - {site?.name}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            gap: 12, 
            marginBottom: 20
          }}>
            <TouchableOpacity style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#9CA3AF'
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
                {permits.filter(p => p.status === 'draft').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Drafts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#2563EB'
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
                {permits.filter(p => p.status === 'pending_approval').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Pending Approval</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#F59E42'
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
                {permits.filter(p => p.status === 'pending_inspection').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Needs Inspection</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#10B981'
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
                {permits.filter(p => p.status === 'active').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Active Permits</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{
              flex: 1,
              minWidth: '45%',
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#EC4899'
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>
                {permits.filter(p => p.status === 'completed').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Completed</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{
            backgroundColor: '#2563EB',
            padding: 16,
            borderRadius: 8,
            marginBottom: 12,
            alignItems: 'center'
          }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Create New Permit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // TODO: Inductions and Permits screens coming in Phase 2

  // Return the main component with floating Permits button
  // The permits button floats at the bottom-right and is visible on all screens
  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Main content will be rendered by the screen conditionals above */}
      {currentScreen === 'welcome' && (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.siteName}>{site.name}</Text>
            <Text style={styles.subtitle}>Kiosk Sign-In System</Text>
            {testMode && (
              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 8, alignSelf: 'flex-start' }}>
                <Text style={{ color: '#991B1B', fontSize: 11, fontWeight: '600' }}>⚠️ TEST MODE</Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.mainContent} scrollEnabled={false}>
            <TouchableOpacity 
              style={styles.largeButton}
              onPress={() => {
                setCurrentScreen('contractor-signin');
                setSelectedContractor(null);
                setContractorSearch('');
              }}
            >
              <Text style={styles.largeButtonText}>👷 Sign In Contractor</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.largeButton}
              onPress={() => {
                setCurrentScreen('visitor-induction');
                setVisitorInductionConfirmed(false);
                setVisitorName('');
                setVisitorCompany('');
                setVisitorPhone('');
                setVisitingPerson('');
              }}
            >
              <Text style={styles.largeButtonText}>👥 Sign In Visitor</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.largeButton}
              onPress={() => {
                setCurrentScreen('signout');
                setSelectedPerson(null);
                loadSignedInPeople();
              }}
            >
              <Text style={styles.largeButtonText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
      
      {/* Floating Permits button - visible on all screens except permits-kiosk */}
      {currentScreen !== 'permits-kiosk' && (
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
            setCurrentScreen('permits-kiosk');
            setPermitsLoading(true);
          }}
        >
          <Text style={{ fontSize: 32 }}>📋</Text>
          <Text style={{ fontSize: 10, color: 'white', marginTop: 2, fontWeight: '600' }}>Permits</Text>
        </TouchableOpacity>
      )}
    </View>
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

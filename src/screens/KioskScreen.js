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
  Platform
} from 'react-native';
import { checkInContractor, checkInVisitor, checkOut, getSignedInPeople } from '../api/signIns';
import { listContractorsBySite } from '../api/contractors';
import { listInductionModules, completeInduction, startInduction, getInductionStatus } from '../api/inductions';
import { listPermits } from '../api/permits';
import { listSites } from '../api/sites';

const KioskScreen = () => {
  // State
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, visitor-signin, contractor-signin, signout, inductions, permits
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
  
  // For signout list
  const [signedInPeople, setSignedInPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  
  // For inductions
  const [inductionModules, setInductionModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  
  // For permits
  const [permits, setPermits] = useState([]);

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
          
          const modulesData = await listInductionModules(matchingSite.id);
          setInductionModules(modulesData);
          
          const permitsData = await listPermits();
          const sitePermits = permitsData.filter(p => p.site_id === matchingSite.id);
          setPermits(sitePermits);
          
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
      const people = await getSignedInPeople(siteId);
      setSignedInPeople(people);
    } catch (error) {
      console.error('Error loading signed in people:', error);
    }
  };

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
      await checkInContractor(selectedContractor.id, siteId, businessUnitId);
      Alert.alert('Success', `${selectedContractor.name} signed in successfully`);
      setCurrentScreen('welcome');
      setSelectedContractor(null);
      setContractorSearch('');
      loadSignedInPeople();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCheckInVisitor = async () => {
    if (!visitorName.trim() || !visitorCompany.trim() || !visitorPhone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      await checkInVisitor(visitorName, visitorCompany, siteId, businessUnitId);
      Alert.alert('Success', `${visitorName} signed in successfully`);
      setCurrentScreen('welcome');
      setVisitorName('');
      setVisitorCompany('');
      setVisitorPhone('');
      setVisitingPerson('');
      loadSignedInPeople();
    } catch (error) {
      Alert.alert('Error', error.message);
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
              setCurrentScreen('visitor-signin');
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

          <TouchableOpacity 
            style={styles.largeButton}
            onPress={() => setCurrentScreen('inductions')}
          >
            <Text style={styles.largeButtonText}>📚 Inductions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.largeButton}
            onPress={() => setCurrentScreen('permits')}
          >
            <Text style={styles.largeButtonText}>📋 Permits</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
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
              <Text style={styles.selectedLabel}>Selected:</Text>
              <Text style={styles.selectedName}>{selectedContractor.name}</Text>
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
            signedInPeople.map((person) => (
              <TouchableOpacity 
                key={person.id}
                style={[
                  styles.personItem,
                  selectedPerson?.id === person.id && styles.personItemSelected
                ]}
                onPress={() => setSelectedPerson(person)}
              >
                <Text style={styles.personName}>{person.name || person.visitor_name}</Text>
                <Text style={styles.personTime}>Checked in: {new Date(person.check_in_time).toLocaleTimeString()}</Text>
              </TouchableOpacity>
            ))
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

  // Inductions Screen
  if (currentScreen === 'inductions') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Induction Modules</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          {inductionModules.length > 0 ? (
            inductionModules.map((module) => (
              <TouchableOpacity 
                key={module.id}
                style={styles.moduleCard}
                onPress={() => {
                  setSelectedModule(module);
                  Alert.alert(module.title, module.content, [
                    { text: 'Close', onPress: () => setSelectedModule(null) }
                  ]);
                }}
              >
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleDescription}>{module.content}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noResults}>No induction modules available</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  // Permits Screen
  if (currentScreen === 'permits') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('welcome')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Site Permits</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          {permits.length > 0 ? (
            permits.map((permit) => (
              <View key={permit.id} style={styles.permitCard}>
                <Text style={styles.permitTitle}>{permit.description}</Text>
                <Text style={styles.permitStatus}>Status: {permit.status}</Text>
                <Text style={styles.permitDetails}>Location: {permit.location}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noResults}>No permits available</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return null;
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
    fontSize: 18,
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
  moduleCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  permitCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  permitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  permitStatus: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  permitDetails: {
    fontSize: 13,
    color: '#6B7280',
  },
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
});

export default KioskScreen;

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { KioskContext } from '../KioskScreen';
import { checkInContractor } from '../../api/signIns';

const KioskContractorSignIn = () => {
  const navigate = useNavigate();
  const { contractors, styles } = useContext(KioskContext);
  
  const [contractorSearch, setContractorSearch] = useState('');
  const [filteredContractors, setFilteredContractors] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState(null);

  const handleContractorSearch = (text) => {
    setContractorSearch(text);
    if (text.trim()) {
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
      const { data, error } = await checkInContractor({
        contractor_id: selectedContractor.id,
        check_in_time: new Date().toISOString(),
      });
      if (error) {
        Alert.alert('Error', error);
        return;
      }
      Alert.alert('Success', `${selectedContractor.name} checked in at ${new Date().toLocaleTimeString()}`);
      setContractorSearch('');
      setSelectedContractor(null);
      setFilteredContractors([]);
      // Navigate back to welcome after 1 second
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to check in: ' + error.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('/')}>
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
};

export default KioskContractorSignIn;

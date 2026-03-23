import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { KioskContext } from '../KioskScreen';
import { checkInVisitor } from '../../api/signIns';

// Format name to proper title case
const formatNameToTitleCase = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const KioskVisitorSignIn = () => {
  const navigate = useNavigate();
  const { siteId, styles } = useContext(KioskContext);
  
  const [visitorName, setVisitorName] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitingPerson, setVisitingPerson] = useState('');

  const handleCheckInVisitor = async () => {
    if (!visitorName.trim() || !visitorCompany.trim() || !visitorPhone.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields');
      return;
    }

    try {
      const visitorData = {
        name: formatNameToTitleCase(visitorName),
        company: visitorCompany,
        phone_number: visitorPhone,
        visiting_person: visitingPerson || null,
        check_in_time: new Date().toISOString(),
        site_id: siteId,
      };

      const { data, error } = await checkInVisitor(visitorData);
      
      if (error) {
        Alert.alert('Error', error);
        return;
      }

      Alert.alert('Success', `${visitorName} checked in at ${new Date().toLocaleTimeString()}`);
      setVisitorName('');
      setVisitorCompany('');
      setVisitorPhone('');
      setVisitingPerson('');
      
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
};

export default KioskVisitorSignIn;

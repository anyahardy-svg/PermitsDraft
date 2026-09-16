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
import { useNavigate } from 'react-router-dom';

import { KioskContext } from '../KioskScreen';
import { checkInVisitor } from '../../api/signIns';
import {
  sanitizePhoneInput,
  validateContractorPhone,
  normalizePhoneForSave,
} from '../../utils/contractorPhone';
import { showTransientMessage } from '../../utils/transientMessage';
import { validateContractorFullName } from '../../utils/contractorName';

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
  const [visitorNameError, setVisitorNameError] = useState('');
  const [visitorCompanyError, setVisitorCompanyError] = useState('');
  const [visitorPhoneError, setVisitorPhoneError] = useState('');

  const handleCheckInVisitor = async () => {
    const nameError = validateContractorFullName(visitorName) || '';
    const companyError = visitorCompany.trim() ? '' : 'Please enter your company';
    const phoneError = validateContractorPhone(visitorPhone) || '';

    setVisitorNameError(nameError);
    setVisitorCompanyError(companyError);
    setVisitorPhoneError(phoneError);

    if (nameError || companyError || phoneError) {
      showTransientMessage(nameError || companyError || phoneError);
      return;
    }

    try {
      const result = await checkInVisitor(
        formatNameToTitleCase(visitorName),
        visitorCompany,
        siteId,
        null,
        normalizePhoneForSave(visitorPhone),
        visitingPerson || null
      );
      
      if (!result?.success) {
        Alert.alert('Error', result?.error || 'Failed to check in');
        return;
      }

      Alert.alert('Success', `${visitorName} checked in at ${new Date().toLocaleTimeString('en-NZ')}`);
      setVisitorName('');
      setVisitorCompany('');
      setVisitorPhone('');
      setVisitingPerson('');
      setVisitorNameError('');
      setVisitorCompanyError('');
      setVisitorPhoneError('');
      
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
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={[styles.input, visitorNameError ? { borderColor: '#DC2626', borderWidth: 2 } : null]}
          placeholder="John Smith"
          value={visitorName}
          onChangeText={(text) => {
            setVisitorName(text);
            if (!validateContractorFullName(text)) {
              setVisitorNameError('');
            }
          }}
        />
        {visitorNameError ? (
          <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginBottom: 12 }}>{visitorNameError}</Text>
        ) : null}

        <Text style={styles.label}>Company *</Text>
        <TextInput
          style={[styles.input, visitorCompanyError ? { borderColor: '#DC2626', borderWidth: 2 } : null]}
          placeholder="Enter your company"
          value={visitorCompany}
          onChangeText={(text) => {
            setVisitorCompany(text);
            if (text.trim()) {
              setVisitorCompanyError('');
            }
          }}
        />
        {visitorCompanyError ? (
          <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginBottom: 12 }}>{visitorCompanyError}</Text>
        ) : null}

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={[styles.input, visitorPhoneError ? { borderColor: '#DC2626', borderWidth: 2 } : null]}
          placeholder="Enter your phone number"
          value={visitorPhone}
          onChangeText={(text) => {
            const phone = sanitizePhoneInput(text);
            setVisitorPhone(phone);
            if (!validateContractorPhone(phone)) {
              setVisitorPhoneError('');
            }
          }}
          keyboardType="phone-pad"
        />
        {visitorPhoneError ? (
          <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginBottom: 12 }}>{visitorPhoneError}</Text>
        ) : null}

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

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigate } from 'react-router-dom';

import { KioskContext } from '../KioskScreen';
import { checkInVisitor } from '../../api/signIns';
import {
  sanitizePhoneInput,
  validateContractorPhone,
  normalizePhoneForSave,
} from '../../utils/contractorPhone';
import { validateContractorFullName } from '../../utils/contractorName';
import {
  showTransientMessage,
  showProgressMessage,
  clearProgressMessage,
} from '../../utils/transientMessage';

const formatNameToTitleCase = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
  const [busy, setBusy] = useState(false);

  const handleCheckInVisitor = async () => {
    if (busy) {
      return;
    }

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

    setBusy(true);
    showProgressMessage('Signing in…');
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
        showTransientMessage(result?.error || 'Failed to check in', 3000);
        return;
      }

      showTransientMessage(`${visitorName} checked in`);
      setVisitorName('');
      setVisitorCompany('');
      setVisitorPhone('');
      setVisitingPerson('');
      setVisitorNameError('');
      setVisitorCompanyError('');
      setVisitorPhoneError('');

      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      showTransientMessage(`Failed to check in: ${error.message}`, 3000);
    } finally {
      clearProgressMessage();
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('/')} disabled={busy}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign In Visitor</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContent}>
        <Text style={styles.label}>Visitor Name *</Text>
        <TextInput
          style={[styles.input, visitorNameError ? { borderColor: '#DC2626', borderWidth: 2 } : null]}
          placeholder="Enter your first and last name"
          value={visitorName}
          onChangeText={(text) => {
            setVisitorName(text);
            if (!validateContractorFullName(text)) {
              setVisitorNameError('');
            }
          }}
          editable={!busy}
        />
        {visitorNameError ? (
          <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginBottom: 12 }}>
            {visitorNameError}
          </Text>
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
          editable={!busy}
        />
        {visitorCompanyError ? (
          <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginBottom: 12 }}>
            {visitorCompanyError}
          </Text>
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
          editable={!busy}
        />
        {visitorPhoneError ? (
          <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginBottom: 12 }}>
            {visitorPhoneError}
          </Text>
        ) : null}

        <Text style={styles.label}>Visiting Person (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Who are you visiting?"
          value={visitingPerson}
          onChangeText={setVisitingPerson}
          editable={!busy}
        />

        <TouchableOpacity
          style={[styles.submitButton, busy && { opacity: 0.6 }]}
          onPress={handleCheckInVisitor}
          disabled={busy}
        >
          {busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitButtonText}>Signing in…</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>✓ Check In</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default KioskVisitorSignIn;

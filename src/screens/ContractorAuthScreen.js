/**
 * Contractor Authentication Screen
 * PIN-based login for Contractor Admin
 * Handles login, PIN setup, and PIN reset
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  getAllContractors,
  verifyContractorPin,
  setContractorPin
} from '../api/contractorAuth';

export default function ContractorAuthScreen({ 
  onLoginSuccess,
  styles 
}) {
  const [step, setStep] = useState('selectContractor'); // 'selectContractor', 'enterPin', 'setupPin'
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showForgotPin, setShowForgotPin] = useState(false);

  // Load contractors on mount
  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    setLoading(true);
    try {
      const response = await getAllContractors();
      if (response.success) {
        setContractors(response.data);
      } else {
        Alert.alert('Error', 'Failed to load contractors');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContractor = (contractor) => {
    setSelectedContractor(contractor);
    setPin('');
    setNewPin('');
    setConfirmPin('');
    setSearchText('');
    setShowForgotPin(false);
    setStep('enterPin');
  };

  const handleVerifyPin = async () => {
    if (!pin.trim()) {
      Alert.alert('Validation', 'Please enter your PIN');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyContractorPin(selectedContractor.id, pin);

      if (response.success) {
        // Login successful
        onLoginSuccess({
          contractorId: response.data.id,
          contractorName: response.data.name,
          companyId: response.data.company_id
        });
      } else if (response.needsSetup) {
        // No PIN set yet, move to setup
        setStep('setupPin');
      } else {
        Alert.alert('Invalid PIN', response.error);
        setPin('');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPin = async () => {
    if (!newPin.trim() || !confirmPin.trim()) {
      Alert.alert('Validation', 'Please enter and confirm your PIN');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Validation', 'PINs do not match');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      Alert.alert('Validation', 'PIN must be exactly 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await setContractorPin(selectedContractor.id, newPin);
      if (response.success) {
        Alert.alert('Success', 'PIN set successfully! Now logging in...');
        // Auto-login after PIN setup
        onLoginSuccess({
          contractorId: selectedContractor.id,
          contractorName: selectedContractor.name,
          companyId: selectedContractor.company_id
        });
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredContractors = contractors.filter(c =>
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Step 1: Select Contractor
  if (step === 'selectContractor') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header || { backgroundColor: '#1F2937', paddingVertical: 20, paddingHorizontal: 16 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>
            Contractor Admin
          </Text>
          <Text style={{ color: '#D1D5DB', fontSize: 12, marginTop: 4 }}>
            Select your contractor account
          </Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 16 }}>
          <TextInput
            placeholder="Search contractors..."
            value={searchText}
            onChangeText={setSearchText}
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              marginBottom: 16,
              color: '#1F2937'
            }}
          />

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : filteredContractors.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
                {searchText ? 'No contractors found' : 'No contractors available'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredContractors.map((contractor) => (
                <TouchableOpacity
                  key={contractor.id}
                  onPress={() => handleSelectContractor(contractor)}
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    padding: 14,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                      {contractor.name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18, color: '#9CA3AF' }}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Step 2: Enter PIN or Setup PIN
  if (step === 'enterPin' || step === 'setupPin') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.header || { backgroundColor: '#1F2937', paddingVertical: 20, paddingHorizontal: 16 }}>
          <TouchableOpacity onPress={() => setStep('selectContractor')}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginTop: 12 }}>
            {selectedContractor?.name}
          </Text>
          <Text style={{ color: '#D1D5DB', fontSize: 12, marginTop: 4 }}>
            {step === 'setupPin' ? 'Set up your PIN' : 'Enter your PIN'}
          </Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ justifyContent: 'center' }}>
          {step === 'enterPin' && !showForgotPin ? (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  PIN (6 digits)
                </Text>
                <TextInput
                  placeholder="000000"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    letterSpacing: 4,
                    color: '#1F2937',
                    textAlign: 'center'
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleVerifyPin}
                disabled={loading}
                style={{
                  backgroundColor: '#3B82F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {loading ? 'Verifying...' : 'Login'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowForgotPin(true)}
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ color: '#3B82F6', fontSize: 14, textAlign: 'center', fontWeight: '500' }}>
                  Forgot PIN?
                </Text>
              </TouchableOpacity>
            </View>
          ) : step === 'enterPin' && showForgotPin ? (
            // Reset PIN flow
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
                Enter a new PIN to reset your forgotten PIN
              </Text>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  New PIN (6 digits)
                </Text>
                <TextInput
                  placeholder="000000"
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    letterSpacing: 4,
                    color: '#1F2937',
                    textAlign: 'center'
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Confirm PIN
                </Text>
                <TextInput
                  placeholder="000000"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    letterSpacing: 4,
                    color: '#1F2937',
                    textAlign: 'center'
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSetupPin}
                disabled={loading}
                style={{
                  backgroundColor: '#10B981',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {loading ? 'Setting PIN...' : 'Reset PIN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowForgotPin(false);
                  setPin('');
                  setNewPin('');
                  setConfirmPin('');
                }}
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Setup PIN for first time
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
                Set up your PIN to access Contractor Admin
              </Text>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  New PIN (6 digits)
                </Text>
                <TextInput
                  placeholder="000000"
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    letterSpacing: 4,
                    color: '#1F2937',
                    textAlign: 'center'
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Confirm PIN
                </Text>
                <TextInput
                  placeholder="000000"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontSize: 16,
                    letterSpacing: 4,
                    color: '#1F2937',
                    textAlign: 'center'
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSetupPin}
                disabled={loading}
                style={{
                  backgroundColor: '#10B981',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {loading ? 'Setting up...' : 'Set PIN & Login'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}

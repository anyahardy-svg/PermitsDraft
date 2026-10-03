import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { KioskContext } from '../KioskScreen';
import { checkInContractor } from '../../api/signIns';
import {
  showTransientMessage,
  showProgressMessage,
  clearProgressMessage,
} from '../../utils/transientMessage';

const KioskContractorSignIn = () => {
  const navigate = useNavigate();
  const { siteId, businessUnitId, contractors, styles } = useContext(KioskContext);

  const [contractorSearch, setContractorSearch] = useState('');
  const [filteredContractors, setFilteredContractors] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [busy, setBusy] = useState(false);
  const selectedContractorIdRef = useRef(null);
  const selectedContractorNameRef = useRef('');

  const handleContractorSearch = (text) => {
    const lockedSelectionName = selectedContractorIdRef.current
      ? (selectedContractorNameRef.current || (selectedContractor?.name || '').trim())
      : '';
    if (lockedSelectionName && text.trim() === lockedSelectionName) {
      setContractorSearch(text);
      setFilteredContractors([]);
      return;
    }

    if (selectedContractorIdRef.current) {
      selectedContractorIdRef.current = null;
      selectedContractorNameRef.current = '';
      setSelectedContractor(null);
    }
    setContractorSearch(text);
    if (text.trim()) {
      const searchLower = text.toLowerCase();
      const filtered = contractors.filter((c) => {
        const contractorName = (c.name || '').toLowerCase();
        const companyName = (c.companyName || c.company_name || c.company || '').toLowerCase();
        return contractorName.includes(searchLower) || companyName.includes(searchLower);
      });
      setFilteredContractors(filtered);
    } else {
      setFilteredContractors([]);
    }
  };

  const handleCheckInContractor = async () => {
    if (busy) {
      return;
    }

    if (!selectedContractor) {
      showTransientMessage('Please select a contractor');
      return;
    }

    setBusy(true);
    showProgressMessage('Signing in…');
    try {
      if (!siteId) {
        showTransientMessage('Site is not loaded yet. Please try again.', 3000);
        return;
      }

      const result = await checkInContractor(
        selectedContractor.id,
        siteId,
        businessUnitId || null,
      );
      if (!result?.success) {
        showTransientMessage(result?.error || 'Check-in failed', 3000);
        return;
      }
      showTransientMessage(`${selectedContractor.name} checked in`);
      selectedContractorIdRef.current = null;
      selectedContractorNameRef.current = '';
      setContractorSearch('');
      setSelectedContractor(null);
      setFilteredContractors([]);
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
        <Text style={styles.headerTitle}>Sign In Contractor</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContent}>
        <Text style={styles.label}>Search for Contractor:</Text>
        <TextInput
          style={styles.input}
          placeholder="Type contractor name or company..."
          value={contractorSearch}
          onChangeText={handleContractorSearch}
          editable={!busy}
        />

        {!selectedContractor && filteredContractors.length > 0 ? (
          <FlatList
            data={filteredContractors}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.contractorItem,
                  selectedContractor?.id === item.id && styles.contractorItemSelected,
                ]}
                onPress={() => {
                  selectedContractorIdRef.current = item.id;
                  selectedContractorNameRef.current = (item.name || '').trim();
                  setSelectedContractor(item);
                  setContractorSearch(item.name || '');
                  setFilteredContractors([]);
                }}
                disabled={busy}
              >
                <Text style={styles.contractorName}>{item.name}</Text>
                {(item.companyName || item.company_name || item.company) && (
                  <Text style={styles.contractorCompany}>
                    {item.companyName || item.company_name || item.company}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        ) : (
          !selectedContractor && contractorSearch.trim().length > 0 && (
            <Text style={styles.noResults}>No contractors found</Text>
          )
        )}

        {selectedContractor && (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedLabel}>Ready to Check In:</Text>
            <Text style={styles.selectedName}>{selectedContractor.name}</Text>
            <Text style={styles.selectedCompany}>
              Company: {selectedContractor.companyName || 'N/A'}
            </Text>
            <Text style={styles.selectedDateTime}>
              Date & Time:{' '}
              {new Date().toLocaleString('en-NZ', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <TouchableOpacity
              style={[styles.submitButton, busy && { opacity: 0.6 }]}
              onPress={handleCheckInContractor}
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
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default KioskContractorSignIn;

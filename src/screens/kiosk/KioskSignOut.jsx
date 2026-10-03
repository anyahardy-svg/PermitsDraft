import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { KioskContext } from '../KioskScreen';
import { getSignedInPeople, checkOut } from '../../api/signIns';
import {
  showTransientMessage,
  showProgressMessage,
  clearProgressMessage,
} from '../../utils/transientMessage';

const KioskSignOut = () => {
  const navigate = useNavigate();
  const { siteId, styles } = useContext(KioskContext);

  const [signedInPeople, setSignedInPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSignedInPeople();
  }, [siteId]);

  const loadSignedInPeople = async () => {
    if (!siteId) return;
    try {
      const result = await getSignedInPeople(siteId);
      setSignedInPeople(result?.success ? (result.data || []) : []);
    } catch (error) {
      console.error('Failed to load signed in people:', error);
    }
  };

  const handleSignOut = async () => {
    if (busy) {
      return;
    }

    if (!selectedPerson) {
      showTransientMessage('Please select a person to sign out');
      return;
    }

    setBusy(true);
    showProgressMessage('Signing out…');
    try {
      const result = await checkOut(selectedPerson.id, siteId);

      if (!result?.success) {
        showTransientMessage(result?.error || 'Sign-out failed', 3000);
        return;
      }

      const name = selectedPerson.contractor_name || selectedPerson.visitor_name || 'Unknown';
      showTransientMessage(`${name} signed out`);
      setSelectedPerson(null);
      await loadSignedInPeople();
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      showTransientMessage(`Failed to sign out: ${error.message}`, 3000);
    } finally {
      clearProgressMessage();
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('/')} disabled={busy}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Out</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContent}>
        <Text style={styles.label}>Select Person to Sign Out:</Text>
        {signedInPeople.length > 0 ? (
          signedInPeople.map((person) => {
            const type = person.type || (person.contractor_id ? 'Contractor' : 'Visitor');
            const name = person.contractor_name || person.visitor_name || 'Unknown';
            const company = person.contractor_company || person.visitor_company || 'N/A';
            const phone = person.contractor_phone || person.phone_number || 'N/A';
            return (
              <TouchableOpacity
                key={person.id}
                style={[
                  styles.personItem,
                  selectedPerson?.id === person.id && styles.personItemSelected,
                ]}
                onPress={() => setSelectedPerson(person)}
                disabled={busy}
              >
                <Text style={styles.personName}>{name}</Text>
                <Text style={styles.personTime}>
                  Checked in: {new Date(person.check_in_time).toLocaleTimeString('en-NZ')}
                </Text>
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
            style={[styles.submitButton, busy && { opacity: 0.6 }]}
            onPress={handleSignOut}
            disabled={busy}
          >
            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Signing out…</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>✓ Sign Out</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

export default KioskSignOut;

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { KioskContext } from '../KioskScreen';
import { getSignedInPeople, checkOut } from '../../api/signIns';

const KioskSignOut = () => {
  const navigate = useNavigate();
  const { siteId, styles } = useContext(KioskContext);
  
  const [signedInPeople, setSignedInPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    loadSignedInPeople();
  }, [siteId]);

  const loadSignedInPeople = async () => {
    if (!siteId) return;
    try {
      const people = await getSignedInPeople(siteId);
      setSignedInPeople(people || []);
    } catch (error) {
      console.error('Failed to load signed in people:', error);
    }
  };

  const handleSignOut = async () => {
    if (!selectedPerson) {
      Alert.alert('Error', 'Please select a person to sign out');
      return;
    }

    try {
      const { error } = await checkOut(selectedPerson.id);
      
      if (error) {
        Alert.alert('Error', error);
        return;
      }

      const name = selectedPerson.contractor_name || selectedPerson.visitor_name || 'Unknown';
      Alert.alert('Success', `${name} signed out at ${new Date().toLocaleTimeString()}`);
      setSelectedPerson(null);
      
      // Reload the list
      await loadSignedInPeople();
      
      // Navigate back to welcome after 1 second
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('/')}>
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
};

export default KioskSignOut;

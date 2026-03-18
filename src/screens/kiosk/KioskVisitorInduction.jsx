import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { KioskContext } from '../KioskScreen';
import { getVisitorInduction } from '../../api/visitorInductions';

const KioskVisitorInduction = () => {
  const navigate = useNavigate();
  const { siteId, styles } = useContext(KioskContext);
  
  const [visitorInductionContent, setVisitorInductionContent] = useState('');
  const [visitorInductionConfirmed, setVisitorInductionConfirmed] = useState(false);

  useEffect(() => {
    const loadInductionContent = async () => {
      try {
        const induction = await getVisitorInduction(siteId);
        if (induction) {
          setVisitorInductionContent(induction.content || 'No induction content available');
        }
      } catch (error) {
        console.error('Failed to load visitor induction:', error);
        setVisitorInductionContent('No induction content available');
      }
    };

    if (siteId) {
      loadInductionContent();
    }
  }, [siteId]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('/')}>
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
          onPress={() => navigate('/sign-in/visitor')}
        >
          <Text style={styles.submitButtonText}>Continue to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default KioskVisitorInduction;

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { sendInvitationRequest } from '../api/sendgrid';

/**
 * RequestAccreditationScreen
 * Public form for companies to request accreditation invitations
 * No authentication required
 */
export default function RequestAccreditationScreen({ onClose, styles }) {
  const [formData, setFormData] = useState({
    name: '', // Contact name
    email: '',
    companyName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    // Validation - safely access formData properties with fallbacks
    if (!formData?.companyName?.trim?.()) {
      Alert.alert('Missing Info', 'Please enter your company name.');
      return;
    }
    if (!formData?.email?.trim?.()) {
      Alert.alert('Missing Info', 'Please enter your email address.');
      return;
    }
    if (!formData?.name?.trim?.()) {
      Alert.alert('Missing Info', 'Please enter your contact name.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData?.email || '')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendInvitationRequest({
        name: formData?.name || '',
        email: formData?.email || '',
        companyName: formData?.companyName || '',
        phone: formData?.phone || 'Not provided',
      });

      if (result?.success) {
        setSubmitted(true);
        setTimeout(() => {
          setFormData({ name: '', email: '', companyName: '', phone: '' });
          setSubmitted(false);
          if (onClose) onClose();
        }, 3000);
      } else {
        Alert.alert('Error', result?.error || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, alignItems: 'center', marginHorizontal: 20 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>✓</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
            Request Submitted!
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
            Thank you for your interest in accreditation. Our team will review your request and contact you shortly.
          </Text>
          <View style={{ height: 60 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles?.header || defaultStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles?.backButton || defaultStyles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles?.title || defaultStyles.title}>Request Accreditation</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        {/* Info Card */}
        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#3B82F6', padding: 16, marginBottom: 24 }}>
          <Text style={{ fontSize: 14, color: '#1E40AF', fontWeight: '600', marginBottom: 8 }}>
            Welcome to Contractor HQ Accreditation
          </Text>
          <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 20 }}>
            Complete the form below to request an accreditation invitation. Our team will review your request and send you the accreditation questionnaire.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles?.section || defaultStyles.section}>
          <View style={styles?.sectionContent || defaultStyles.sectionContent}>
            {/* Company Name */}
            <Text style={styles?.label || defaultStyles.label}>Company Name *</Text>
            <TextInput
              style={styles?.input || defaultStyles.input}
              placeholder="Enter your company name"
              value={formData.companyName}
              onChangeText={(text) => setFormData({ ...formData, companyName: text })}
              editable={!loading}
              placeholderTextColor="#9CA3AF"
            />

            {/* Contact Name */}
            <Text style={styles?.label || defaultStyles.label}>Your Name *</Text>
            <TextInput
              style={styles?.input || defaultStyles.input}
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={!loading}
              placeholderTextColor="#9CA3AF"
            />

            {/* Email */}
            <Text style={styles?.label || defaultStyles.label}>Email Address *</Text>
            <TextInput
              style={styles?.input || defaultStyles.input}
              placeholder="Enter your email address"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              editable={!loading}
              placeholderTextColor="#9CA3AF"
            />

            {/* Phone */}
            <Text style={styles?.label || defaultStyles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles?.input || defaultStyles.input}
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              editable={!loading}
              placeholderTextColor="#9CA3AF"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles?.addButton || defaultStyles.addButton, { backgroundColor: loading ? '#9CA3AF' : '#3B82F6', marginTop: 24 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles?.addButtonText || defaultStyles.addButtonText}>
                {loading ? '⏳ Submitting...' : '→ Submit Request'}
              </Text>
            </TouchableOpacity>

            {/* Footer Note */}
            <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>
                By submitting this form, you agree to our privacy policy and terms of service. We'll use your information only to process your accreditation request.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2563EB',
  },
  backButton: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  sectionContent: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

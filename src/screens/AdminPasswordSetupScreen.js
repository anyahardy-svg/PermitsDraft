import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { supabaseClient } from '../supabaseClient';
import bcryptjs from 'bcryptjs';

export default function AdminPasswordSetupScreen({ email, onPasswordSet, onCancel, styles }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetPassword = async () => {
    setError('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Hash the password
      const passwordHash = await bcryptjs.hash(password, 10);

      // Update the admin user
      const { error: updateError } = await supabaseClient
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('email', email);

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        setError('Failed to set password. Please try again.');
        return;
      }

      console.log('✅ Password set successfully for:', email);
      Alert.alert('Success', 'Password set! Please log in now.', [
        { text: 'OK', onPress: () => onPasswordSet() }
      ]);
    } catch (err) {
      console.error('❌ Error setting password:', err);
      setError('An error occurred while setting your password');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      handleSetPassword();
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ padding: 24, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
          Set Your Password
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
          Welcome, {email}! Please create a password to access your admin account.
        </Text>

        {/* Password Input */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
          Password
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: error ? '#DC2626' : '#D1D5DB',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 16,
            backgroundColor: '#F9FAFB',
          }}
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onKeyPress={handleKeyPress}
          editable={!loading}
        />

        {/* Confirm Password Input */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
          Confirm Password
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: error ? '#DC2626' : '#D1D5DB',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 16,
            backgroundColor: '#F9FAFB',
          }}
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onKeyPress={handleKeyPress}
          editable={!loading}
        />

        {/* Error Message */}
        {error && (
          <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 6, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#DC2626' }}>
            <Text style={{ color: '#991B1B', fontWeight: '500' }}>{error}</Text>
          </View>
        )}

        {/* Password Requirements */}
        <View style={{ backgroundColor: '#F0F9FF', padding: 12, borderRadius: 6, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#0284C7' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#0C4A6E', marginBottom: 4 }}>Password Requirements:</Text>
          <Text style={{ fontSize: 12, color: '#0C4A6E', marginBottom: 2 }}>✓ At least 6 characters</Text>
          <Text style={{ fontSize: 12, color: '#0C4A6E' }}>✓ Passwords must match</Text>
        </View>

        {/* Set Password Button */}
        <TouchableOpacity
          style={{
            backgroundColor: loading ? '#9CA3AF' : '#2563EB',
            padding: 14,
            borderRadius: 6,
            alignItems: 'center',
            marginBottom: 12,
          }}
          onPress={handleSetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Set Password</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: 14,
            borderRadius: 6,
            alignItems: 'center',
          }}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

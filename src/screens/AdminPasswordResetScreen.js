/**
 * Admin Password Reset Screen
 * Allows admins to reset their password using a valid reset token from email
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { resetPasswordWithToken } from '../api/adminAuth';

export default function AdminPasswordResetScreen({ token, onResetSuccess, onCancel }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('No reset token provided. Invalid reset link.');
    }
  }, [token]);

  const handleResetPassword = async () => {
    setError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please enter a password in both fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Resetting password with token');
      
      const result = await resetPasswordWithToken(token, newPassword);

      if (result.success) {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been changed. You can now login with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                if (onResetSuccess) {
                  onResetSuccess();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/admin/';
                }
              },
            },
          ]
        );
      } else {
        setError(result.error || 'Failed to reset password');
        Alert.alert('Error', result.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('An error occurred: ' + err.message);
      Alert.alert('Error', 'An error occurred while resetting your password');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      handleResetPassword();
    }
  };

  if (!tokenValid) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#DC2626', marginBottom: 12 }}>
            Invalid Reset Link
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
            This reset link is invalid or has expired. Please request a new password reset.
          </Text>
          <TouchableOpacity
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: '#3B82F6',
              borderRadius: 8,
            }}
            onPress={onCancel}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: '#1F2937', paddingTop: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: 'white' }}>Reset Your Password</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          Enter your new password below
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Error Message */}
        {error ? (
          <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: '#DC2626', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {/* New Password Input */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            New Password
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 12,
              fontSize: 14,
              backgroundColor: '#F9FAFB',
            }}
            placeholder="Enter new password"
            placeholderTextColor="#9CA3AF"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            editable={!loading}
            onKeyPress={handleKeyPress}
          />
          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Minimum 8 characters
          </Text>
        </View>

        {/* Confirm Password Input */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            Confirm Password
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 12,
              fontSize: 14,
              backgroundColor: '#F9FAFB',
            }}
            placeholder="Confirm your password"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
            onKeyPress={handleKeyPress}
          />
        </View>

        {/* Info Box */}
        <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 16 }}>
            Make sure your password is:
            {'\n'}• At least 8 characters long
            {'\n'}• Contains uppercase and lowercase letters
            {'\n'}• Contains numbers
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 8,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
          }}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 8,
            backgroundColor: '#10B981',
            alignItems: 'center',
            opacity: loading ? 0.6 : 1,
          }}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

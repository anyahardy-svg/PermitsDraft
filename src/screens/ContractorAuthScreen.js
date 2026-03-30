/**
 * Contractor Authentication Screen
 * Email/password login for Contractor Admin
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
} from 'react-native';
import {
  loginWithEmailPassword,
  getCurrentUser,
  sendPasswordResetEmail,
} from '../api/contractorAuth';

export default function ContractorAuthScreen({ 
  onLoginSuccess,
  styles 
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const { success, contractor } = await getCurrentUser();
    if (success && contractor) {
      // User already logged in, skip to dashboard
      onLoginSuccess({
        contractorId: contractor.id,
        contractorName: contractor.name,
        companyId: contractor.company_id,
        email: contractor.email
      });
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Validation', 'Please enter your password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await loginWithEmailPassword(email, password);

      if (response.success) {
        // Login successful
        onLoginSuccess({
          contractorId: response.data.contractorId,
          contractorName: response.data.contractorName,
          companyId: response.data.companyId,
          email: response.data.email
        });
      } else {
        Alert.alert('Login Failed', response.error || 'Unable to log in. Please check your credentials.');
        setPassword('');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!setupEmail.trim()) {
      Alert.alert('Validation', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(setupEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address');
      return;
    }

    setSetupLoading(true);
    try {
      const response = await sendPasswordResetEmail(setupEmail);

      if (response.success) {
        Alert.alert('Check Your Email', response.message);
        setSetupEmail('');
        setShowPasswordSetup(false);
      } else {
        Alert.alert('Error', response.error || 'Failed to send password reset email');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSetupLoading(false);
    }
  };

  if (showPasswordSetup) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
        {/* Header */}
        <View style={{ 
          backgroundColor: '#1F2937',
          paddingVertical: 50, 
          paddingHorizontal: 16,
          paddingTop: 80
        }}>
          <TouchableOpacity 
            onPress={() => setShowPasswordSetup(false)}
            style={{ marginBottom: 16 }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 18, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: '800',
          }}>
            Reset Password
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 14, 
            marginTop: 8
          }}>
            Enter your email to receive a password reset link
          </Text>
        </View>

        {/* Setup Form */}
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingTop: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3
            }}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: 8 
                }}>
                  Email Address
                </Text>
                <TextInput
                  placeholder="name@company.com"
                  value={setupEmail}
                  onChangeText={setSetupEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!setupLoading}
                  placeholderTextColor="#D1D5DB"
                  style={{
                    borderWidth: 1.5,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    fontSize: 15,
                    color: '#1F2937',
                    backgroundColor: '#F9FAFB'
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSendPasswordReset}
                disabled={setupLoading}
                style={{
                  backgroundColor: setupLoading ? '#9CA3AF' : '#3B82F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginBottom: 12
                }}
              >
                {setupLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ 
                    color: 'white', 
                    fontWeight: '700', 
                    fontSize: 16 
                  }}>
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{
                backgroundColor: '#F0F9FF',
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: '#3B82F6',
                marginTop: 16
              }}>
                <Text style={{ 
                  fontSize: 12, 
                  color: '#1E40AF',
                  lineHeight: 18,
                  fontWeight: '500'
                }}>
                  We'll send you a secure link via email. Click it to set or reset your password, then log in with your new credentials.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Header with gradient effect */}
      <View style={{ 
        backgroundColor: '#1F2937',
        paddingVertical: 50, 
        paddingHorizontal: 16,
        paddingTop: 80
      }}>
        {/* Logo/Icon Area */}
        <View style={{ 
          alignItems: 'center',
          marginBottom: 24
        }}>
          <View style={{
            width: 60,
            height: 60,
            backgroundColor: '#3B82F6',
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 32 }}>🏢</Text>
          </View>
          <Text style={{ 
            color: 'white', 
            fontSize: 32, 
            fontWeight: '800',
            textAlign: 'center'
          }}>
            Contractor Hub
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 15, 
            marginTop: 8,
            textAlign: 'center'
          }}>
            Manage permits and administration
          </Text>
        </View>
      </View>

      {/* Login Form Container */}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingTop: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {/* Form Card */}
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#1F2937',
              marginBottom: 24
            }}>
              Sign In
            </Text>

            {/* Email Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ 
                fontSize: 13, 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: 8 
              }}>
                Email Address
              </Text>
              <TextInput
                placeholder="name@company.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                placeholderTextColor="#D1D5DB"
                style={{
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 15,
                  color: '#1F2937',
                  backgroundColor: '#F9FAFB'
                }}
              />
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: '#374151'
                }}>
                  Password
                </Text>
                <TouchableOpacity onPress={() => setShowPasswordSetup(true)}>
                  <Text style={{ 
                    fontSize: 12, 
                    color: '#3B82F6',
                    fontWeight: '500'
                  }}>
                    Forgot?
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 14,
                backgroundColor: '#F9FAFB'
              }}>
                <TextInput
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  placeholderTextColor="#D1D5DB"
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    fontSize: 15,
                    color: '#1F2937'
                  }}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{ padding: 8 }}
                >
                  <Text style={{ fontSize: 18, color: '#6B7280' }}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me */}
            <TouchableOpacity 
              onPress={() => setRememberMe(!rememberMe)}
              disabled={loading}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderWidth: 1.5,
                borderColor: '#D1D5DB',
                borderRadius: 5,
                backgroundColor: rememberMe ? '#3B82F6' : 'white',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {rememberMe && <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 14, color: '#4B5563', fontWeight: '500' }}>Remember me</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9CA3AF' : '#3B82F6',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 12
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ 
                  color: 'white', 
                  fontWeight: '700', 
                  fontSize: 16 
                }}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              marginVertical: 16
            }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              <Text style={{ marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            </View>

            {/* Setup/Reset Password Link */}
            <TouchableOpacity
              onPress={() => setShowPasswordSetup(true)}
              style={{
                backgroundColor: '#F3F4F6',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB'
              }}
            >
              <Text style={{ 
                color: '#3B82F6', 
                fontWeight: '600', 
                fontSize: 15 
              }}>
                Need a Password? Get Reset Link
              </Text>
            </TouchableOpacity>

            {/* Contact Support */}
            <View style={{
              backgroundColor: '#F0F9FF',
              borderRadius: 8,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: '#3B82F6',
              marginTop: 16
            }}>
              <Text style={{ 
                fontSize: 12, 
                color: '#1E40AF',
                lineHeight: 18,
                fontWeight: '500'
              }}>
                💡 If you don't have a password yet or forgot yours, click "Forgot?" next to the password field or the button below to request a reset link.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <Text style={{ 
            fontSize: 11, 
            color: '#9CA3AF', 
            textAlign: 'center',
            marginTop: 24,
            fontWeight: '500'
          }}>
            © 2026 Contractor Hub. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

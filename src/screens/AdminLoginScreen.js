import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { loginAdminUser, checkAdminPasswordSetup } from '../api/adminAuth';
import { sendAdminPasswordResetEmail } from '../api/sendgrid';
import AdminPasswordSetupScreen from './AdminPasswordSetupScreen';

export default function AdminLoginScreen({ onLoginSuccess, onCancel, styles }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleEmailSubmit = async () => {
    setError('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    console.log('📧 Submitting email:', email);
    setLoading(true);
    try {
      const setupCheck = await checkAdminPasswordSetup(email);
      console.log('Setup check result:', setupCheck);

      if (setupCheck.needsSetup) {
        console.log('🔐 Showing password setup screen');
        setSetupEmail(email);
        setShowPasswordSetup(true);
      } else if (setupCheck.adminId) {
        console.log('✅ User has password, showing login');
        setEmailSubmitted(true);
      } else {
        setError('Admin account not found');
      }
    } catch (err) {
      console.error('❌ Error checking email:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    console.log('🔐 Admin login attempt:', email);
    setLoading(true);
    try {
      const result = await loginAdminUser(email, password);

      if (result.success) {
        console.log('✅ Admin login successful:', result.data);
        onLoginSuccess(result.data);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      Alert.alert('Missing Info', 'Please enter your email');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      console.log('📧 Requesting password reset for:', forgotPasswordEmail);
      
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const resetUrl = `${baseUrl}?type=invited`;
      
      const result = await sendAdminPasswordResetEmail(
        forgotPasswordEmail,
        'Admin',
        resetUrl
      );

      if (result.success) {
        Alert.alert(
          'Reset Email Sent',
          'Check your email for password reset instructions.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Error sending reset email:', error);
      Alert.alert('Error', 'Failed to send reset email: ' + error.message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      if (!emailSubmitted) {
        handleEmailSubmit();
      } else {
        handleLogin();
      }
    }
  };

  // Show forgot password screen if needed
  if (showForgotPassword) {
    return (
      <View style={styles?.container || { flex: 1, backgroundColor: 'white' }}>
        {/* Header */}
        <View style={{ padding: 16, backgroundColor: '#1F2937', paddingTop: 40 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: 'white' }}>Reset Password</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Enter your email to receive a password reset link</Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Email Input */}
          <View style={{ marginTop: 32 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Email</Text>
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
              placeholder="admin@company.com"
              placeholderTextColor="#9CA3AF"
              value={forgotPasswordEmail}
              onChangeText={setForgotPasswordEmail}
              editable={!forgotPasswordLoading}
              keyboardType="email-address"
              onKeyPress={
                Platform.OS === 'web' ? (e) => {
                  if (e.nativeEvent.key === 'Enter') {
                    handleForgotPassword();
                  }
                } : undefined
              }
            />
          </View>

          {/* Info Text */}
          <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginTop: 24 }}>
            <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 18 }}>
              A password reset link will be sent to your email. Follow the link to set a new password.
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
            onPress={() => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            }}
            disabled={forgotPasswordLoading}
          >
            <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 8,
              backgroundColor: '#3B82F6',
              alignItems: 'center',
              opacity: forgotPasswordLoading ? 0.6 : 1,
            }}
            onPress={handleForgotPassword}
            disabled={forgotPasswordLoading}
          >
            {forgotPasswordLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Send Reset Email</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show password setup screen if needed
  if (showPasswordSetup) {
    return (
      <AdminPasswordSetupScreen
        email={setupEmail}
        onPasswordSet={() => {
          setShowPasswordSetup(false);
          setEmail(setupEmail);
          setPassword('');
          setEmailSubmitted(true);
        }}
        onCancel={() => {
          setShowPasswordSetup(false);
          setEmail('');
          setError('');
        }}
        styles={styles}
      />
    );
  }

  return (
    <View style={styles?.container || { flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: '#1F2937', paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: 'white' }}>Admin Login</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, justifyContent: 'center' }}>
        <View style={{ gap: 20 }}>
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🔐</Text>
            <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
              Enter your admin credentials
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#DC2626' }}>
              <Text style={{ color: '#991B1B', fontSize: 14, fontWeight: '500' }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Email</Text>
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
              placeholder="admin@company.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              editable={!loading && !emailSubmitted}
              onKeyPress={handleKeyPress}
            />
          </View>

          {/* If email not submitted yet, show email submit button */}
          {!emailSubmitted ? (
            <>
              <TouchableOpacity
                style={{
                  backgroundColor: '#3B82F6',
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: loading ? 0.6 : 1,
                }}
                onPress={handleEmailSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setEmail('')}>
                <Text style={{ color: '#3B82F6', fontSize: 14, textAlign: 'center' }}>Use different email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Password Input */}
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Password</Text>
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
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#3B82F6',
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 8,
                  opacity: loading ? 0.6 : 1,
                }}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setEmail(''); setPassword(''); setEmailSubmitted(false); setError(''); }}>
                <Text style={{ color: '#3B82F6', fontSize: 14, textAlign: 'center' }}>Use different email</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowForgotPassword(true)} style={{ marginTop: 12 }}>
                <Text style={{ color: '#F59E0B', fontSize: 14, textAlign: 'center', fontWeight: '600' }}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

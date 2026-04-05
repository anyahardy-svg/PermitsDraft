import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { loginAdminUser, checkAdminPasswordSetup } from '../api/adminAuth';
import AdminPasswordSetupScreen from './AdminPasswordSetupScreen';

export default function AdminLoginScreen({ onLoginSuccess, onCancel, styles }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

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

  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      if (!emailSubmitted) {
        handleEmailSubmit();
      } else {
        handleLogin();
      }
    }
  };

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

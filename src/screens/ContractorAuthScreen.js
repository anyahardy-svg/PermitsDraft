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

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={styles.header || { 
        backgroundColor: '#2563EB', 
        paddingVertical: 40, 
        paddingHorizontal: 16,
        paddingTop: 60
      }}>
        <Text style={{ 
          color: 'white', 
          fontSize: 28, 
          fontWeight: '700',
          textAlign: 'center'
        }}>
          Contractor Hub
        </Text>
        <Text style={{ 
          color: '#DBEAFE', 
          fontSize: 14, 
          marginTop: 8,
          textAlign: 'center'
        }}>
          Sign in to manage your permits and admin
        </Text>
      </View>

      {/* Login Form */}
      <ScrollView 
        style={{ flex: 1, padding: 20 }} 
        contentContainerStyle={{ justifyContent: 'center', paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 16 }}>
          {/* Email Input */}
          <View>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: '#1F2937', 
              marginBottom: 8 
            }}>
              Email Address
            </Text>
            <TextInput
              placeholder="your.email@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: '#1F2937',
                backgroundColor: 'white'
              }}
            />
          </View>

          {/* Password Input */}
          <View>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '600', 
              color: '#1F2937', 
              marginBottom: 8 
            }}>
              Password
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingHorizontal: 14,
              backgroundColor: 'white'
            }}>
              <TextInput
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                placeholderTextColor="#9CA3AF"
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: '#1F2937'
                }}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
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
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <View style={{
              width: 18,
              height: 18,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 4,
              backgroundColor: rememberMe ? '#2563EB' : 'white',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {rememberMe && <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 14, color: '#4B5563' }}>Remember me</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#9CA3AF' : '#2563EB',
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 8
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

          {/* Help Text */}
          <View style={{ 
            backgroundColor: '#EFF6FF', 
            borderLeftWidth: 4,
            borderLeftColor: '#3B82F6',
            padding: 12,
            borderRadius: 6,
            marginTop: 8
          }}>
            <Text style={{ 
              fontSize: 13, 
              color: '#1E40AF',
              lineHeight: 18
            }}>
              💡 Use your contractor company email and the password provided by your administrator.
            </Text>
          </View>

          {/* Footer */}
          <Text style={{ 
            fontSize: 12, 
            color: '#6B7280', 
            textAlign: 'center',
            marginTop: 16
          }}>
            Version 1.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

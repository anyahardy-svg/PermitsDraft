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
import { supabase } from '../supabaseClient';
import {
  loginWithEmailPassword,
  getCurrentUser,
  sendPasswordResetEmail,
  verifyPasswordResetOtp,
  inviteContractor,
} from '../api/contractorAuth';

export default function ContractorAuthScreen({ 
  onLoginSuccess,
  showPasswordReset,
  setShowPasswordReset,
  styles 
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(showPasswordReset || false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  
  // OTP flow states
  const [passwordResetStage, setPasswordResetStage] = useState('email'); // 'email', 'otp', 'password'
  const [passwordFlowType, setPasswordFlowType] = useState('reset'); // 'reset' (OTP) or 'newUser' (no OTP)
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync showPasswordReset prop with local state
  useEffect(() => {
    if (showPasswordReset) {
      setShowPasswordSetup(true);
    }
  }, [showPasswordReset]);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Log when passwordFlowType changes
  useEffect(() => {
    console.log('🔄 passwordFlowType changed to:', passwordFlowType);
  }, [passwordFlowType]);

  // Log when stage changes
  useEffect(() => {
    console.log('🔄 passwordResetStage changed to:', passwordResetStage);
  }, [passwordResetStage]);

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
    console.log('handleSendPasswordReset called with email:', setupEmail, 'flow:', passwordFlowType);
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
    setOtpError(null);
    try {
      if (passwordFlowType === 'newUser') {
        // NEW USER: Just go straight to password form
        console.log('🆕 New user - going straight to password form');
        setPasswordResetStage('password');
      } else {
        // PASSWORD RESET: Send OTP code via email
        console.log('🔐 Password reset flow - calling sendPasswordResetEmail');
        const response = await sendPasswordResetEmail(setupEmail);
        console.log('sendPasswordResetEmail response:', response);

        if (response.success) {
          console.log('Password reset OTP sent - moving to OTP entry stage');
          setPasswordResetStage('otp');
          setOtpCode('');
          Alert.alert('Check Your Email', response.message);
        } else {
          console.log('Password reset error:', response.error);
          setOtpError(response.error);
          Alert.alert('Error', response.error || 'Failed to send password reset email');
        }
      }
    } catch (error) {
      console.log('Password reset exception:', error.message);
      setOtpError(error.message);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    console.log('handleVerifyOtp called with email:', setupEmail);
    if (!otpCode.trim()) {
      setOtpError('Please enter the code from your email');
      return;
    }

    if (otpCode.replace(/\s/g, '').length < 6) {
      setOtpError('Code must be at least 6 characters');
      return;
    }

    setSetupLoading(true);
    setOtpError(null);
    try {
      console.log('Verifying OTP for email:', setupEmail);
      const response = await verifyPasswordResetOtp(setupEmail, otpCode);

      if (response.success) {
        console.log('OTP verified successfully - moving to password set stage');
        setPasswordResetStage('password');
        setOtpCode('');
      } else {
        console.log('OTP verification error:', response.error);
        setOtpError(response.error);
        Alert.alert('Invalid Code', response.error || 'The code you entered is invalid or has expired');
      }
    } catch (error) {
      console.log('OTP verification exception:', error.message);
      setOtpError(error.message);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Validation', 'Please enter a password');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Validation', 'Please confirm your password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }

    setSetupLoading(true);
    try {
      if (passwordFlowType === 'newUser') {
        // NEW USER: First create auth user via inviteContractor, then sign them in
        console.log('🆕 Creating new contractor account...');
        const inviteResult = await inviteContractor(setupEmail);
        
        if (!inviteResult.success) {
          Alert.alert('Error', inviteResult.error || 'Failed to create account');
          setSetupLoading(false);
          return;
        }

        console.log('✅ Contractor created, now setting password...');
        
        // Sign them in with temp password flow to establish session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: setupEmail,
          password: newPassword
        });

        if (signInError) {
          // Try to update password if sign-in fails (user might not have password set yet)
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (updateError) {
            Alert.alert('Error', updateError.message);
            setSetupLoading(false);
            return;
          }
        }

        console.log('✅ Password set successfully');
        Alert.alert('Success', 'Your account has been created! You can now log in.');
        
        // Reset and go back to login
        setShowPasswordSetup(false);
        setPasswordResetStage('email');
        setPasswordFlowType('reset');
        setSetupEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setOtpError(null);
      } else {
        // PASSWORD RESET: Just update password for existing user
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) {
          setOtpError(error.message);
          Alert.alert('Error', error.message);
        } else {
          console.log('✅ Password set successfully');
          Alert.alert('Success', 'Your password has been set. You can now log in.');
          
          // Reset all states
          setShowPasswordSetup(false);
          setPasswordResetStage('email');
          setPasswordFlowType('reset');
          setSetupEmail('');
          setNewPassword('');
          setConfirmPassword('');
          setOtpCode('');
          setOtpError(null);
        }
        
        if (setShowPasswordReset) {
          setShowPasswordReset(false);
        }
      }
    } catch (error) {
      console.error('Password set error:', error);
      setOtpError(error.message);
      Alert.alert('Error', error.message || 'Failed to set password');
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
            onPress={() => {
              setShowPasswordSetup(false);
              setPasswordResetStage('email');
              setPasswordFlowType('reset');
              setSetupEmail('');
              setNewPassword('');
              setConfirmPassword('');
              setOtpCode('');
              setOtpError(null);
              if (setShowPasswordReset) {
                setShowPasswordReset(false);
              }
            }}
            style={{ marginBottom: 16 }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 18, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: '800',
          }}>
            {passwordFlowType === 'newUser' ? (
              <>
                {passwordResetStage === 'email' && '🎉 Welcome to Contractor Hub!'}
                {passwordResetStage === 'password' && '🔐 Create Your Password'}
              </>
            ) : (
              <>
                {passwordResetStage === 'email' && 'Reset Password'}
                {passwordResetStage === 'otp' && 'Enter Code'}
                {passwordResetStage === 'password' && 'Create New Password'}
              </>
            )}
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 14, 
            marginTop: 8
          }}>
            {passwordFlowType === 'newUser' ? (
              <>
                {passwordResetStage === 'email' && 'Enter your email to create your account'}
                {passwordResetStage === 'password' && 'Create a strong password for your account'}
              </>
            ) : (
              <>
                {passwordResetStage === 'email' && 'Enter your email to receive a password reset code'}
                {passwordResetStage === 'otp' && 'Enter the 6-digit code we sent to your email'}
                {passwordResetStage === 'password' && 'Create a strong password for your account'}
              </>
            )}
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
              {otpError && (
                <View style={{
                  backgroundColor: '#FEF2F2',
                  borderRadius: 8,
                  padding: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: '#DC2626',
                  marginBottom: 16
                }}>
                  <Text style={{ 
                    fontSize: 12, 
                    color: '#991B1B',
                    fontWeight: '500'
                  }}>
                    {otpError}
                  </Text>
                </View>
              )}

              {/* Stage 1: Email Input */}
              {passwordResetStage === 'email' && (
                <>
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
                        {passwordFlowType === 'newUser' ? 'Continue' : 'Send Reset Code'}
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
                      We'll send you a 6-digit code via email. This code is safer than magic links as email security tools can't automatically use it.
                    </Text>
                  </View>
                </>
              )}

              {/* Stage 2: OTP Input - for both Reset and New User flows */}
              {passwordResetStage === 'otp' && (
                <>
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ 
                      fontSize: 13, 
                      fontWeight: '600', 
                      color: '#374151', 
                      marginBottom: 8 
                    }}>
                      Verification Code
                    </Text>
                    <TextInput
                      placeholder="000000"
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      editable={!setupLoading}
                      placeholderTextColor="#D1D5DB"
                      maxLength={10}
                      style={{
                        borderWidth: 1.5,
                        borderColor: '#E5E7EB',
                        borderRadius: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        fontSize: 18,
                        color: '#1F2937',
                        backgroundColor: '#F9FAFB',
                        letterSpacing: 2,
                        textAlign: 'center',
                        fontWeight: '600'
                      }}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleVerifyOtp}
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
                        Verify Code
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
                      Check your email for the 6-digit code. It may take a minute to arrive.
                    </Text>
                  </View>
                </>
              )}

              {/* Stage 3: Password Input */}
              {passwordResetStage === 'password' && (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      fontSize: 13, 
                      fontWeight: '600', 
                      color: '#374151', 
                      marginBottom: 8 
                    }}>
                      New Password
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      paddingRight: 10,
                      backgroundColor: '#F9FAFB'
                    }}>
                      <TextInput
                        placeholder="Enter new password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        editable={!setupLoading}
                        placeholderTextColor="#D1D5DB"
                        style={{
                          flex: 1,
                          paddingHorizontal: 14,
                          paddingVertical: 11,
                          fontSize: 15,
                          color: '#1F2937'
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      >
                        <Text style={{ fontSize: 18 }}>
                          {showNewPassword ? '👁️' : '👁️‍🗨️'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ 
                      fontSize: 13, 
                      fontWeight: '600', 
                      color: '#374151', 
                      marginBottom: 8 
                    }}>
                      Confirm Password
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      paddingRight: 10,
                      backgroundColor: '#F9FAFB'
                    }}>
                      <TextInput
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        editable={!setupLoading}
                        placeholderTextColor="#D1D5DB"
                        style={{
                          flex: 1,
                          paddingHorizontal: 14,
                          paddingVertical: 11,
                          fontSize: 15,
                          color: '#1F2937'
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Text style={{ fontSize: 18 }}>
                          {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSetPassword}
                    disabled={setupLoading}
                    style={{
                      backgroundColor: setupLoading ? '#9CA3AF' : '#10B981',
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
                        Set Password
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: 8,
                    padding: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: '#10B981',
                    marginTop: 16
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: '#166534',
                      lineHeight: 18,
                      fontWeight: '500'
                    }}>
                      Password must be at least 6 characters. Use a mix of letters, numbers, and symbols for security.
                    </Text>
                  </View>
                </>
              )}
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
              <Text style={{ marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 }}>other options</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            </View>

            {/* Forgot Password Button */}
            <TouchableOpacity
              onPress={() => {
                console.log('👉 Forgot Password flow selected');
                setPasswordFlowType('reset');
                setPasswordResetStage('email');
                setShowPasswordSetup(true);
                setSetupEmail('');
                setOtpCode('');
                setOtpError(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={{
                backgroundColor: '#FEF3C7',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#FCD34D',
                marginBottom: 12
              }}
            >
              <Text style={{ 
                color: '#92400E', 
                fontWeight: '600', 
                fontSize: 15 
              }}>
                🔐 Forgot Password? Reset via Code
              </Text>
            </TouchableOpacity>

            {/* New User Button */}
            <TouchableOpacity
              onPress={() => {
                console.log('🆕 New User flow selected');
                setPasswordFlowType('newUser');
                setPasswordResetStage('email');
                setShowPasswordSetup(true);
                setSetupEmail('');
                setOtpCode('');
                setOtpError(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={{
                backgroundColor: '#DBEAFE',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#93C5FD'
              }}
            >
              <Text style={{ 
                color: '#1E40AF', 
                fontWeight: '600', 
                fontSize: 15 
              }}>
                🎉 New Contractor? Set Password
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
                💡 <Text style={{ fontWeight: '700' }}>Three ways to access your account:</Text>{'\n'}
                • <Text style={{ fontWeight: '600' }}>Sign In</Text> - if you know your password{'\n'}
                • <Text style={{ fontWeight: '600' }}>Forgot Password</Text> - get a code to reset your password{'\n'}
                • <Text style={{ fontWeight: '600' }}>New Contractor</Text> - create an account right now
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

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
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

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

  // Check if this is a recovery link from Supabase (when user clicks email link)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const token = hashParams.get('token');
      const type = hashParams.get('type');
      
      console.log('🔍 URL hash detected:', { hash: hash.substring(0, 100), token: token ? '✓' : '✗', type });
      
      // If this is a recovery/invitation link, show password setup immediately
      if (token && type === 'recovery') {
        console.log('✅ Recovery link detected - showing password form');
        setPasswordFlowType('newUser'); 
        setPasswordResetStage('password'); 
        setShowPasswordSetup(true);
        window.history.replaceState(null, '', window.location.pathname); // Clean up URL
      }
    }
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
    // Prevent multiple concurrent requests
    if (loading) {
      console.log('⏳ Request already in progress, ignoring duplicate click');
      return;
    }

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
    // Prevent multiple concurrent requests
    if (setupLoading) {
      console.log('⏳ Request already in progress, ignoring duplicate click');
      return;
    }

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
        // NEW USER: Go straight to password form
        console.log('🆕 New user - showing password form');
        setPasswordResetStage('password');
      } else {
        // PASSWORD RESET: Send OTP code
        console.log('🔐 Password reset flow - sending OTP');
        const response = await sendPasswordResetEmail(setupEmail);

        if (response.success) {
          console.log('✅ OTP sent - moving to OTP entry stage');
          setPasswordResetStage('otp');
          setOtpCode('');
          Alert.alert('Check Your Email', response.message);
        } else {
          console.log('❌ Error sending password reset:', response.error);
          setOtpError(response.error);
          Alert.alert('Error', response.error || 'Failed to send reset code');
        }
      }
    } catch (error) {
      console.log('Exception:', error.message);
      setOtpError(error.message);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    // Prevent multiple concurrent requests
    if (setupLoading) {
      console.log('⏳ Request already in progress, ignoring duplicate click');
      return;
    }

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
    // Prevent multiple concurrent requests
    if (setupLoading) {
      console.log('⏳ Request already in progress, ignoring duplicate click');
      return;
    }

    Alert.alert('Starting', 'Beginning password setup for: ' + setupEmail);

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
        // NEW USER: Sign up directly with email and password
        console.log('🆕 Signing up new contractor:', setupEmail);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: setupEmail,
          password: newPassword,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : 'https://contractorhq.co.nz'
          }
        });

        if (signUpError) {
          console.error('❌ Signup error:', signUpError);
          
          // Handle specific rate limit error
          if (signUpError.message && signUpError.message.includes('50 seconds')) {
            Alert.alert(
              '⏳ Too Many Attempts',
              'For security reasons, please wait 50 seconds before trying again. This prevents unauthorized account creation attempts.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setSetupLoading(false);
                  }
                }
              ]
            );
          } else {
            Alert.alert('Error', signUpError.message || 'Failed to create account');
            setSetupLoading(false);
          }
          return;
        }

        // Success! Account created
        console.log('✅ Account created successfully');
        console.log('📋 Full signUpData:', JSON.stringify(signUpData, null, 2));
        console.log('📋 signUpData.user:', signUpData.user);
        
        if (!signUpData.user) {
          console.error('❌ No user data returned from signup');
          Alert.alert('Error', 'Account creation failed - no user data returned');
          setSetupLoading(false);
          return;
        }

        console.log('📋 user.id:', signUpData.user.id);
        console.log('📋 user.email:', signUpData.user.email);
        console.log('📋 user.confirmed_at:', signUpData.user.confirmed_at);
        console.log('📋 user.email_confirmed_at:', signUpData.user.email_confirmed_at);
        
        // Check if email confirmation is required (confirmed_at will be null if email not confirmed)
        const emailNeedsConfirmation = !signUpData.user.confirmed_at && !signUpData.user.email_confirmed_at;
        console.log('📧 emailNeedsConfirmation:', emailNeedsConfirmation);
        
        setSetupLoading(false);
        
        if (emailNeedsConfirmation) {
          console.log('📧 EMAIL NEEDS CONFIRMATION - showing verification screen');
          setShowPasswordSetup(false);
          setVerificationEmail(setupEmail);
          setShowVerificationMessage(true);
          console.log('📧 showVerificationMessage set to true, showPasswordSetup set to false');
          return;
        } else {
          console.log('✅ Account created, no email confirmation required - logging user in');
          // Reset form
          setShowPasswordSetup(false);
          setPasswordResetStage('email');
          setPasswordFlowType('reset');
          setSetupEmail('');
          setNewPassword('');
          setConfirmPassword('');
          setOtpCode('');
          setOtpError(null);
          
          // No email confirmation required, user can login immediately
          if (onLoginSuccess && signUpData.user) {
            console.log('📞 Calling onLoginSuccess with email:', setupEmail);
            onLoginSuccess({
              contractorId: setupEmail,
              contractorName: setupEmail,
              companyId: null,
              email: setupEmail
            });
          }
        }
        return; // Exit early, don't run the finally block's setSetupLoading(false)
      } else {
        // PASSWORD RESET: Update password for existing user
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
          
          if (setShowPasswordReset) {
            setShowPasswordReset(false);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setOtpError(error.message);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSetupLoading(false);
    }
  };

  // Show verification message screen
  if (showVerificationMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
        <View style={{ 
          backgroundColor: '#1F2937',
          paddingVertical: 50, 
          paddingHorizontal: 16,
          paddingTop: 80,
          alignItems: 'center'
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 56, 
            marginBottom: 16
          }}>
            ✅
          </Text>
          <Text style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: '800',
            textAlign: 'center'
          }}>
            Account Created!
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 15, 
            marginTop: 12,
            textAlign: 'center'
          }}>
            Check your email to verify your account
          </Text>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 40 }}
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
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: 16,
                lineHeight: 24
              }}>
                We've sent a verification email to:
              </Text>
              
              <Text style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#3B82F6',
                marginBottom: 24,
                padding: 12,
                backgroundColor: '#F0F9FF',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                {verificationEmail}
              </Text>

              <Text style={{
                fontSize: 14,
                color: '#4B5563',
                marginBottom: 20,
                lineHeight: 22
              }}>
                Click the verification link in the email to activate your account. After verification, you'll be logged in automatically to the dashboard.
              </Text>

              <View style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#F59E0B',
                marginBottom: 20
              }}>
                <Text style={{ 
                  fontSize: 13, 
                  color: '#92400E',
                  fontWeight: '500',
                  lineHeight: 20
                }}>
                  💡 <Text style={{ fontWeight: '700' }}>Didn't receive an email?</Text> Check your spam folder, or wait a minute and refresh this page.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setShowVerificationMessage(false);
                  setVerificationEmail('');
                }}
                style={{
                  backgroundColor: '#3B82F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontWeight: '700', 
                  fontSize: 16 
                }}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

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
                {passwordResetStage === 'password' && 'Now create your password'}
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
                      📧 Check your email for a 6-digit code (looks like 123456). Ignore any links in the email - just enter the code here.
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
                    activeOpacity={setupLoading ? 1 : 0.7}
                    style={{
                      backgroundColor: setupLoading ? '#9CA3AF' : '#10B981',
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginBottom: 12,
                      opacity: setupLoading ? 0.7 : 1
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

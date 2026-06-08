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
import { submitJoinRequest } from '../api/joinRequests';

export default function ContractorAuthScreen({ 
  onLoginSuccess,
  showPasswordReset,
  invitationFlow,
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

  // Join request states
  const [showJoinRequest, setShowJoinRequest] = useState(false);
  const [joinRequestName, setJoinRequestName] = useState('');
  const [joinRequestEmail, setJoinRequestEmail] = useState('');
  const [joinRequestPhone, setJoinRequestPhone] = useState('');
  const [joinRequestCompany, setJoinRequestCompany] = useState('');
  const [joinRequestCompanyId, setJoinRequestCompanyId] = useState(null);
  const [joinRequestLoading, setJoinRequestLoading] = useState(false);
  const [joinRequestSuccess, setJoinRequestSuccess] = useState(false);
  const [joinRequestOnSite, setJoinRequestOnSite] = useState(true); // true = contractor, false = admin staff

  const showUserMessage = (title, message) => {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const establishSessionFromUrl = async () => {
    if (!supabase || typeof window === 'undefined') {
      return null;
    }

    const hash = window.location.hash || '';
    const queryParams = new URLSearchParams(window.location.search);
    const authCode = queryParams.get('code');

    if (authCode) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
      if (error) {
        console.error('❌ Failed to exchange auth code:', error.message);
      } else if (data.session) {
        return data.session;
      }
    }

    if (hash.length > 1) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('❌ Failed to set session from invite link:', error.message);
        } else if (data.session) {
          return data.session;
        }
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const clearAuthUrlParams = () => {
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', window.location.pathname);
  };

  const completeLoginAfterPassword = async (loginEmail, loginPassword) => {
    const response = await loginWithEmailPassword(loginEmail, loginPassword);

    if (response.success && response.data) {
      onLoginSuccess({
        contractorId: response.data?.contractorId,
        contractorName: response.data?.contractorName,
        companyId: response.data?.companyId,
        email: response.data?.email
      });
      return true;
    }

    setEmail(loginEmail);
    setPassword('');
    setShowPasswordSetup(false);
    setPasswordResetStage('email');
    setPasswordFlowType('reset');
    showUserMessage(
      'Login Failed',
      response?.error || 'Your password was set, but sign-in failed. Please try logging in manually.'
    );
    return false;
  };

  // Sync showPasswordReset prop with local state
  useEffect(() => {
    if (showPasswordReset) {
      setShowPasswordSetup(true);
    }
  }, [showPasswordReset]);

  // Handle invitation flow from email link
  useEffect(() => {
    if (!invitationFlow) return;

    const initializeInvitationFlow = async () => {
      console.log('✅ Invitation flow activated - showing password setup');
      setPasswordFlowType('newUser');
      setShowPasswordSetup(true);

      const queryParams = new URLSearchParams(window.location.search);
      const emailParam = queryParams.get('email');
      if (emailParam) {
        setSetupEmail(decodeURIComponent(emailParam));
        setPasswordResetStage('password');
        clearAuthUrlParams();
        return;
      }

      const session = await establishSessionFromUrl();
      if (session?.user?.email) {
        setSetupEmail(session.user.email);
        setPasswordResetStage('password');
        clearAuthUrlParams();
        return;
      }

      setPasswordResetStage('email');
    };

    initializeInvitationFlow();
  }, [invitationFlow]);

  // Check if user is already logged in on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryParams = new URLSearchParams(window.location.search);
      const freshLogin = queryParams.get('fresh_login');
      
      // If fresh_login is set, clear any cached session to force new login
      if (freshLogin === '1') {
        console.log('🔄 Fresh login requested - clearing cached session');
        // Clear contractor auth session from localStorage
        localStorage.removeItem('contractor_session');
        localStorage.removeItem('contractor_token');
        localStorage.removeItem('contractor_id');
        // Clear the URL parameter
        window.history.replaceState(null, '', window.location.pathname);
        // Don't check existing session when fresh login is requested
        return;
      }
    }
    
    checkExistingSession();
  }, []);

  // Check if this is a recovery link or invitation link
  useEffect(() => {
    const initializeAuthLink = async () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash || '';
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const token = hashParams.get('token');
      const hashType = hashParams.get('type');
      const queryParams = new URLSearchParams(window.location.search);
      const queryType = queryParams.get('type');
      const freshLogin = queryParams.get('fresh_login');
      const authCode = queryParams.get('code');

      console.log('🔍 URL parameters detected:', {
        hash: hash.substring(0, 100),
        accessToken: accessToken ? '✓' : '✗',
        token: token ? '✓' : '✗',
        hashType,
        queryType,
        freshLogin,
        authCode: authCode ? '✓' : '✗',
      });

      if (freshLogin === '1') {
        console.log('✅ Fresh login flow - showing login form');
        setEmail('');
        setPassword('');
        setShowPasswordSetup(false);
        return;
      }

      if (queryType === 'invited') {
        console.log('✅ Invitation query link detected - showing password form');
        const emailParam = queryParams.get('email');
        if (emailParam) {
          setSetupEmail(decodeURIComponent(emailParam));
        }
        setPasswordFlowType('newUser');
        setPasswordResetStage(emailParam ? 'password' : 'email');
        setShowPasswordSetup(true);
        clearAuthUrlParams();
        return;
      }

      const isHashAuthLink = (accessToken || token) && (
        hashType === 'recovery' || hashType === 'invite' || hashType === 'signup' || hashType === 'magiclink'
      );
      const isCodeAuthLink = !!authCode;

      if (isHashAuthLink || isCodeAuthLink) {
        console.log('✅ Supabase auth link detected - establishing session first');
        const session = await establishSessionFromUrl();
        const resolvedType = hashType || (isCodeAuthLink ? 'invite' : null);

        if (session?.user?.email) {
          console.log('✅ Pre-filling email from session:', session.user.email);
          setSetupEmail(session.user.email);
        }

        setPasswordFlowType(resolvedType === 'recovery' ? 'reset' : 'newUser');
        setPasswordResetStage(session?.user?.email ? 'password' : 'email');
        setShowPasswordSetup(true);
        clearAuthUrlParams();
      }
    };

    initializeAuthLink();
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

      if (response.success && response.data) {
        // Login successful
        onLoginSuccess({
          contractorId: response.data?.contractorId,
          contractorName: response.data?.contractorName,
          companyId: response.data?.companyId,
          email: response.data?.email
        });
      } else {
        showUserMessage('Login Failed', response?.error || 'Password or username incorrect');
        setPassword('');
      }
    } catch (error) {
      showUserMessage('Error', error.message || 'An unexpected error occurred');
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

      if (response?.success) {
        console.log('OTP verified successfully - moving to password set stage');
        setPasswordResetStage('password');
        setOtpCode('');
      } else {
        console.log('OTP verification error:', response?.error);
        setOtpError(response?.error);
        Alert.alert('Invalid Code', response?.error || 'The code you entered is invalid or has expired');
      }
    } catch (error) {
      console.log('OTP verification exception:', error?.message);
      setOtpError(error?.message);
      Alert.alert('Error', error?.message || 'An error occurred');
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
        console.log('🔐 Setting password for new contractor:', setupEmail);

        const { data: { session } } = await supabase.auth.getSession();
        const emailForLogin = (setupEmail || session?.user?.email || '').trim();

        if (!emailForLogin) {
          setPasswordResetStage('email');
          showUserMessage('Error', 'Please enter the email address from your invitation link before setting a password.');
          return;
        }

        if (session?.user) {
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (updateError) {
            throw new Error(updateError.message || 'Failed to set password');
          }

          console.log('✅ Password set via active invite session');
          await supabase.auth.signOut();
          const loggedIn = await completeLoginAfterPassword(emailForLogin, newPassword);
          if (loggedIn) {
            setShowPasswordSetup(false);
            setNewPassword('');
            setConfirmPassword('');
          }
          return;
        }

        try {
          const passwordResponse = await fetch('/api/set-contractor-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: emailForLogin,
              password: newPassword
            })
          });

          if (!passwordResponse.ok) {
            const error = await passwordResponse.json().catch(() => ({}));
            console.error('❌ Password set failed:', error);

            if (passwordResponse.status === 404 || passwordResponse.status === 500) {
              console.log('📧 API unavailable, using password recovery email instead');
              const recoveryResult = await sendPasswordResetEmail(emailForLogin);
              if (recoveryResult.success) {
                showUserMessage(
                  'Password Recovery Email Sent',
                  `A password recovery code has been sent to ${emailForLogin}. Please check your email and enter the 6-digit code.`
                );
              } else {
                showUserMessage('Error', recoveryResult.error || 'Failed to send recovery email');
              }
              return;
            }

            throw new Error(error.error || 'Failed to set password');
          }

          await passwordResponse.json();
          console.log('✅ Password set successfully via API');

          const loggedIn = await completeLoginAfterPassword(emailForLogin, newPassword);
          if (loggedIn) {
            setShowPasswordSetup(false);
            setSetupEmail('');
            setNewPassword('');
            setConfirmPassword('');
            setOtpCode('');
            setOtpError(null);
          }
          return;
        } catch (apiError) {
          console.error('❌ Error:', apiError);
          showUserMessage('Error', apiError.message || 'Failed to set password');
          return;
        }
      } else {
        // PASSWORD RESET: Update password for existing user (already authenticated)
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) {
          setOtpError(error.message);
          showUserMessage('Error', error.message);
        } else {
          console.log('✅ Password set successfully');
          const { data: { session } } = await supabase.auth.getSession();
          const emailForLogin = setupEmail || session?.user?.email || email;

          if (emailForLogin) {
            await supabase.auth.signOut();
            const loggedIn = await completeLoginAfterPassword(emailForLogin, newPassword);
            if (loggedIn) {
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
          } else {
            showUserMessage('Success', 'Your password has been set. You can now log in.');
            setShowPasswordSetup(false);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setOtpError(error.message);
      showUserMessage('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSubmitJoinRequest = async () => {
    if (joinRequestLoading) return;

    if (!joinRequestName.trim()) {
      Alert.alert('Validation', 'Please enter your name');
      return;
    }

    if (!joinRequestEmail.trim()) {
      Alert.alert('Validation', 'Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(joinRequestEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address');
      return;
    }

    if (!joinRequestCompany.trim()) {
      Alert.alert('Validation', 'Please enter your company name');
      return;
    }

    setJoinRequestLoading(true);
    try {
      const response = await submitJoinRequest(
        joinRequestEmail,
        joinRequestName,
        joinRequestPhone,
        joinRequestCompanyId,
        joinRequestCompany,
        joinRequestOnSite
      );

      if (response.success) {
        console.log('✅ Join request submitted');
        // Save email before showing success (don't clear yet)
        // Show success first, then clear form
        setJoinRequestSuccess(true);
      } else {
        Alert.alert('Error', response.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setJoinRequestLoading(false);
    }
  };

  // Show join request success screen
  if (joinRequestSuccess) {
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
            📋
          </Text>
          <Text style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: '800',
            textAlign: 'center'
          }}>
            Request Submitted!
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 15, 
            marginTop: 12,
            textAlign: 'center'
          }}>
            We'll review your request soon
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
                Your request to join {joinRequestCompany} has been submitted!
              </Text>

              <Text style={{
                fontSize: 14,
                color: '#6B7280',
                marginBottom: 20,
                lineHeight: 22
              }}>
                An administrator from {joinRequestCompany} will review your request within 24 hours. You'll receive an email confirmation once your request is approved.
              </Text>

              <View style={{
                backgroundColor: '#F0FDF4',
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: '#10B981',
                marginBottom: 24
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#166534',
                  lineHeight: 18
                }}>
                  ✅ Keep an eye on your email ({joinRequestEmail}) for updates
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setJoinRequestSuccess(false);
                  setShowJoinRequest(false);
                  // Clear form
                  setJoinRequestName('');
                  setJoinRequestEmail('');
                  setJoinRequestPhone('');
                  setJoinRequestCompany('');
                  setJoinRequestCompanyId(null);
                  setJoinRequestOnSite(true);
                  // Reset to login screen
                  setEmail('');
                  setPassword('');
                }}
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show join request form
  if (showJoinRequest) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
        <View style={{ 
          backgroundColor: '#1F2937',
          paddingVertical: 50, 
          paddingHorizontal: 16,
          paddingTop: 80
        }}>
          <TouchableOpacity
            onPress={() => setShowJoinRequest(false)}
            style={{ marginBottom: 16 }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 18, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ 
            color: 'white', 
            fontSize: 28, 
            fontWeight: '800',
          }}>
            Request to Join
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 14, 
            marginTop: 8
          }}>
            Fill in your information and select your company
          </Text>
        </View>

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
              {/* Full Name */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: 8 
                }}>
                  Full Name *
                </Text>
                <TextInput
                  placeholder="John Doe"
                  value={joinRequestName}
                  onChangeText={setJoinRequestName}
                  editable={!joinRequestLoading}
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

              {/* Email */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: 8 
                }}>
                  Email Address *
                </Text>
                <TextInput
                  placeholder="john@example.com"
                  value={joinRequestEmail}
                  onChangeText={setJoinRequestEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!joinRequestLoading}
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

              {/* Phone */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: 8 
                }}>
                  Phone Number (optional)
                </Text>
                <TextInput
                  placeholder="021 123 4567"
                  value={joinRequestPhone}
                  onChangeText={setJoinRequestPhone}
                  keyboardType="phone-pad"
                  editable={!joinRequestLoading}
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

              {/* Company */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: 8 
                }}>
                  Company Name *
                </Text>
                <TextInput
                  placeholder="e.g., Acme Contractors Ltd"
                  value={joinRequestCompany}
                  onChangeText={setJoinRequestCompany}
                  editable={!joinRequestLoading}
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
                <Text style={{
                  fontSize: 12,
                  color: '#9CA3AF',
                  marginTop: 6
                }}>
                  Enter the name of your company
                </Text>
              </View>

              {/* On-Site Question */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: 12 
                }}>
                  Will you be working on site? *
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setJoinRequestOnSite(true)}
                    disabled={joinRequestLoading}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderWidth: 2,
                      borderColor: joinRequestOnSite ? '#3B82F6' : '#E5E7EB',
                      borderRadius: 8,
                      backgroundColor: joinRequestOnSite ? '#EFF6FF' : '#F9FAFB',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: 15,
                      fontWeight: joinRequestOnSite ? '700' : '500',
                      color: joinRequestOnSite ? '#3B82F6' : '#6B7280'
                    }}>
                      Yes (Contractor)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setJoinRequestOnSite(false)}
                    disabled={joinRequestLoading}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderWidth: 2,
                      borderColor: !joinRequestOnSite ? '#3B82F6' : '#E5E7EB',
                      borderRadius: 8,
                      backgroundColor: !joinRequestOnSite ? '#EFF6FF' : '#F9FAFB',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: 15,
                      fontWeight: !joinRequestOnSite ? '700' : '500',
                      color: !joinRequestOnSite ? '#3B82F6' : '#6B7280'
                    }}>
                      No (Admin Staff)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitJoinRequest}
                disabled={joinRequestLoading}
                style={{
                  backgroundColor: joinRequestLoading ? '#9CA3AF' : '#10B981',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginBottom: 12
                }}
              >
                {joinRequestLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ 
                    color: 'white', 
                    fontWeight: '700', 
                    fontSize: 16 
                  }}>
                    Submit Request
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: '#F59E0B'
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#92400E',
                  lineHeight: 18
                }}>
                  📝 A company administrator will review your request and send you an invitation email if approved.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

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
                Please confirm your email, after which time you can log in.
              </Text>

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
                {passwordResetStage === 'email' && '🎉 Welcome to Contractor HQ!'}
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
                  {passwordFlowType === 'newUser' && (
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
                  )}

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
            Contractor HQ
          </Text>
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 15, 
            marginTop: 8,
            textAlign: 'center'
          }}>
            Manage your company profile
          </Text>
          <Text style={{ 
            color: '#6B7280', 
            fontSize: 13, 
            marginTop: 12,
            textAlign: 'center',
            lineHeight: 20
          }}>
            Firth Industries • Winstone Aggregates • Rodney Aggregates Supply • Rangitikei Aggregates • Roys Hill Aggregates
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
                  onSubmitEditing={handleLogin}
                  returnKeyType="send"
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
                borderColor: '#93C5FD',
                marginBottom: 12
              }}
            >
              <Text style={{ 
                color: '#1E40AF', 
                fontWeight: '600', 
                fontSize: 15 
              }}>
                🎉 Create Your Password
              </Text>
            </TouchableOpacity>

            {/* Request to Join Button */}
            <TouchableOpacity
              onPress={() => {
                console.log('📝 Request to Join flow selected');
                setShowJoinRequest(true);
              }}
              style={{
                backgroundColor: '#F0FDF4',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#86EFAC'
              }}
            >
              <Text style={{ 
                color: '#166534', 
                fontWeight: '600', 
                fontSize: 15 
              }}>
                📋 Request to Join Contractor HQ
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
                💡 <Text style={{ fontWeight: '700' }}>Ways to access your account:</Text>{'\n'}
                • <Text style={{ fontWeight: '600' }}>Sign In</Text> - if you know your password{'\n'}
                • <Text style={{ fontWeight: '600' }}>Forgot Password</Text> - reset your password if you forgot it{'\n'}
                • <Text style={{ fontWeight: '600' }}>Create Your Password</Text> - set up a password if you are already an inducted contractor{'\n'}
                • <Text style={{ fontWeight: '600' }}>Request to Join Contractor HQ</Text> - set up a new account
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
            © 2026 Contractor HQ. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

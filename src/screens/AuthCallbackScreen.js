import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../supabaseClient';

const AuthCallbackScreen = ({ onPasswordSet }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    try {
      console.log('🔍 Verifying password reset token...');
      
      if (typeof window === 'undefined') {
        setError('Window error');
        setIsVerifying(false);
        return;
      }

      // Log the actual URL
      const fullUrl = window.location.href;
      const urlHash = window.location.hash;
      const urlSearch = window.location.search;
      
      console.log('📍 Full URL:', fullUrl);
      console.log('🔗 Hash:', urlHash);
      console.log('🔍 Search:', urlSearch);

      // Parse error parameters from hash
      const hashParams = new URLSearchParams(urlHash.substring(1));
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      const tokenType = hashParams.get('type');
      const token = hashParams.get('token');
      
      console.log('🔴 URL Parameters:', { 
        errorCode, 
        errorDescription, 
        tokenType,
        tokenPresent: !!token
      });

      if (errorCode === 'otp_expired') {
        console.error('❌ Token has expired - LESS THAN A MINUTE means token is being invalidated immediately');
        console.error('   Possible causes:', [
          '1. Token is single-use and being consumed on page load',
          '2. Token TTL is less than 60 seconds at Supabase server',
          '3. Token is invalid from the start in the email'
        ].join('\n   '));
        setError('Your password reset link has expired. Password reset links are only valid for 24 hours. Please request a new link by clicking "Forgot Password" on the login screen.');
        setTokenValid(false);
        setIsVerifying(false);
        return;
      }

      if (errorCode && errorCode !== 'otp_expired') {
        console.error(`❌ Supabase error: ${errorCode} - ${errorDescription}`);
        setError(`Password reset failed: ${decodeURIComponent(errorDescription || errorCode)}. Please request a new link.`);
        setTokenValid(false);
        setIsVerifying(false);
        return;
      }

      // Check localStorage for session info
      console.log('💾 Checking localStorage for session...');
      const localSession = localStorage.getItem('supabase.auth.token');
      console.log('   Token in localStorage:', !!localSession ? 'YES' : 'NO');
      
      // Check sessionStorage
      const sessionToken = sessionStorage.getItem('supabase.auth.token');
      console.log('   Token in sessionStorage:', !!sessionToken ? 'YES' : 'NO');

      // Wait longer for Supabase to process the token
      console.log('⏳ Waiting 2 seconds for Supabase to process token...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to get session
      console.log('🔐 Calling supabase.auth.getSession()...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('📊 Session check result:', { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        sessionError: sessionError?.message || 'none'
      });

      if (sessionError) {
        console.error('   Session error:', sessionError);
      }

      if (session?.user) {
        console.log('✅ Session established successfully');
        setTokenValid(true);
        setError(null);
      } else {
        console.error('❌ No session established - token may have been consumed without authentication');
        setError('Password reset link is invalid or has expired. Please request a new link.');
        setTokenValid(false);
      }
    } catch (err) {
      console.error('❌ Exception during token verification:', err.message);
      console.error('   Stack:', err.stack);
      setError(`Error: ${err.message}`);
      setTokenValid(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetPassword = async () => {
    // Validation
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Please confirm your password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message);
        Alert.alert('Error', updateError.message);
      } else {
        // Success - notify parent or navigate
        Alert.alert('Success', 'Your password has been set successfully. You can now log in with your email and password.');
        
        if (onPasswordSet) {
          onPasswordSet();
        } else {
          // Fallback: try to sign out and go to login
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to set password. Please try again.';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.verifyingText}>Verifying password reset link...</Text>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Invalid or Expired Link</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity 
            style={styles.requestNewButton}
            onPress={() => {
              if (onPasswordSet) {
                onPasswordSet('request-reset'); // Go back to request new link
              }
            }}
          >
            <Text style={styles.requestNewButtonText}>Request New Link</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (onPasswordSet) {
                onPasswordSet(); // Go back to login
              }
            }}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>⚙️</Text>
          <Text style={styles.title}>Set Your Password</Text>
          <Text style={styles.subtitle}>Create a secure password for your account</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>At least 6 characters</Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Set Password Button */}
          <TouchableOpacity
            style={[styles.setButton, loading && styles.setButtonDisabled]}
            onPress={handleSetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.setButtonText}>Set Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your password will be secure and used to log in to your contractor account.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#fee',
    borderLeftWidth: 4,
    borderLeftColor: '#c33',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  setButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  setButtonDisabled: {
    opacity: 0.7,
  },
  setButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  backButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  requestNewButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  requestNewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
});

export default AuthCallbackScreen;

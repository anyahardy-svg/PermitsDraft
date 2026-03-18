import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { KioskContext } from '../KioskScreen';

const KioskWelcome = () => {
  const navigate = useNavigate();
  const { site, testMode, styles } = useContext(KioskContext);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.siteName}>{site?.name || 'Kiosk'}</Text>
        <Text style={styles.subtitle}>Kiosk Sign-In System</Text>
        {testMode && (
          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#991B1B', fontSize: 11, fontWeight: '600' }}>⚠️ TEST MODE</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.mainContent} scrollEnabled={false}>
        <TouchableOpacity 
          style={styles.largeButton}
          onPress={() => navigate('/sign-in/contractor')}
        >
          <Text style={styles.largeButtonText}>👷 Sign In Contractor</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.largeButton}
          onPress={() => navigate('/sign-in/visitor')}
        >
          <Text style={styles.largeButtonText}>👥 Sign In Visitor</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.largeButton}
          onPress={() => navigate('/sign-out')}
        >
          <Text style={styles.largeButtonText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default KioskWelcome;

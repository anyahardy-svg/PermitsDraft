import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { migrateTrainingStorage } from '../api/adminMaintenance';

function formatResult(result) {
  if (!result) {
    return '';
  }

  const { records, matrices } = result;
  return [
    `Training records: ${records.migrated} to move, ${records.skipped} already organized, ${records.failed} failed`,
    `Training matrices: ${matrices.migrated} to move, ${matrices.skipped} already organized, ${matrices.failed} failed`,
  ].join('\n');
}

export default function AdminMaintenanceScreen({
  adminEmail,
  onNavigateBack,
  styles,
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const runMigration = async (dryRun) => {
    if (!adminEmail) {
      Alert.alert('Session expired', 'Please log out and log back into the Admin Panel.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Password required', 'Enter your admin password to continue.');
      return;
    }

    setLoading(true);
    try {
      const result = await migrateTrainingStorage({
        email: adminEmail,
        password,
        dryRun,
      });
      setLastResult(result);

      if (dryRun) {
        const toMove = result.records.migrated + result.matrices.migrated;
        if (toMove === 0) {
          Alert.alert('All organized', 'Training files are already stored under company names.');
          return;
        }

        Alert.alert(
          'Ready to organize',
          `${toMove} file(s) will be moved into company-name folders.\n\n${formatResult(result)}\n\nRun the fix now?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Fix now', onPress: () => runMigration(false) },
          ]
        );
        return;
      }

      Alert.alert(
        'Done',
        result.success
          ? `Training storage is now organized by company name.\n\n${formatResult(result)}`
          : `Some files could not be moved.\n\n${formatResult(result)}`
      );
    } catch (error) {
      Alert.alert('Could not complete', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Training Storage</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 20,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
            Organize files by company name
          </Text>
          <Text style={{ fontSize: 15, color: '#4B5563', lineHeight: 22, marginBottom: 20 }}>
            Older training files may be stored under random ID folders. This moves them into
            company-name folders in Supabase Storage — the same way accreditations work.
            New uploads already use company names once the latest update is deployed.
          </Text>

          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            Your admin password
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
              marginBottom: 20,
            }}
            placeholder="Enter password to confirm"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <TouchableOpacity
            style={{
              backgroundColor: loading ? '#9CA3AF' : '#EC4899',
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={() => runMigration(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                Organize training files
              </Text>
            )}
          </TouchableOpacity>

          {lastResult && (
            <Text style={{ marginTop: 20, fontSize: 14, color: '#374151', lineHeight: 20 }}>
              {formatResult(lastResult)}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { migrateTrainingStorage } from '../api/adminMaintenance';

function formatResult(result) {
  if (!result) {
    return '';
  }

  const { records, matrices, dryRun } = result;
  const actionWord = dryRun ? 'ready to move' : 'moved';
  const matrixActionWord = dryRun ? 'ready to move' : 'moved';

  return [
    `Training records: ${records.migrated} ${actionWord}, ${records.skipped} already organized, ${records.failed} failed`,
    `Training matrices: ${matrices.migrated} ${matrixActionWord}, ${matrices.skipped} already organized, ${matrices.failed} failed`,
  ].join('\n');
}

const STATUS_STYLES = {
  error: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    color: '#991B1B',
  },
  success: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    color: '#065F46',
  },
  info: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
    color: '#1E40AF',
  },
};

function StatusBanner({ type = 'info', message }) {
  if (!message) {
    return null;
  }

  const palette = STATUS_STYLES[type] || STATUS_STYLES.info;

  return (
    <View style={{
      backgroundColor: palette.backgroundColor,
      borderRadius: 8,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: palette.borderColor,
    }}>
      <Text style={{ fontSize: 14, color: palette.color, lineHeight: 20 }}>
        {message}
      </Text>
    </View>
  );
}

export default function AdminMaintenanceScreen({
  adminEmail,
  onNavigateBack,
  styles,
}) {
  const [password, setPassword] = useState('');
  const [loadingStep, setLoadingStep] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [status, setStatus] = useState(null);

  const runMigration = async (dryRun) => {
    setStatus(null);

    if (!adminEmail) {
      setStatus({
        type: 'error',
        message: 'Session expired. Please log out and log back into the Admin Panel.',
      });
      return;
    }

    if (!password.trim()) {
      setStatus({
        type: 'error',
        message: 'Enter your admin password to continue.',
      });
      return;
    }

    setLoadingStep(dryRun ? 'check' : 'move');
    try {
      const result = await migrateTrainingStorage({
        email: adminEmail,
        password,
        dryRun,
      });

      if (dryRun) {
        setApplyResult(null);
        setPreviewResult(result);

        const toMove = result.records.migrated + result.matrices.migrated;
        if (toMove === 0) {
          setStatus({
            type: 'success',
            message: 'All training files are already stored under company names.',
          });
        } else {
          setStatus({
            type: 'info',
            message: `Found ${toMove} file(s) ready to move. Click Step 2 below to move them.`,
          });
        }
        return;
      }

      setApplyResult(result);
      setPreviewResult(null);

      const moved = result.records.migrated + result.matrices.migrated;
      const failed = result.records.failed + result.matrices.failed;

      if (failed > 0) {
        setStatus({
          type: 'error',
          message: `${moved} file(s) moved, ${failed} failed. Check the result below, then try again.`,
        });
        return;
      }

      setStatus({
        type: 'success',
        message: `${moved} file(s) moved into company-name folders. Refresh Supabase Storage to see the new folders.`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong.',
      });
    } finally {
      setLoadingStep(null);
    }
  };

  const filesReadyToMove = previewResult
    ? previewResult.records.migrated + previewResult.matrices.migrated
    : 0;

  const activeResult = applyResult || previewResult;

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
            Step 1 checks how many old files still sit under random ID folders.
            Step 2 moves them into company-name folders in Supabase Storage, like accreditations.
          </Text>

          <StatusBanner type={status?.type} message={status?.message} />

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
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            editable={!loadingStep}
          />

          <TouchableOpacity
            style={{
              backgroundColor: loadingStep ? '#9CA3AF' : '#3B82F6',
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={() => runMigration(true)}
            disabled={!!loadingStep}
          >
            {loadingStep === 'check' ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                Step 1: Check files
              </Text>
            )}
          </TouchableOpacity>

          {previewResult && filesReadyToMove > 0 && (
            <View style={{
              backgroundColor: '#FEF3C7',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#FCD34D',
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 8 }}>
                {filesReadyToMove} file(s) ready to move
              </Text>
              <Text style={{ fontSize: 14, color: '#92400E', lineHeight: 20, marginBottom: 12 }}>
                Click the button below to move them into company-name folders.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: loadingStep ? '#9CA3AF' : '#EC4899',
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => runMigration(false)}
                disabled={!!loadingStep}
              >
                {loadingStep === 'move' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                    Step 2: Move {filesReadyToMove} files now
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeResult && (
            <Text style={{ marginTop: 8, fontSize: 14, color: '#374151', lineHeight: 20 }}>
              {formatResult(activeResult)}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import CompanyAccreditationScreen from './CompanyAccreditationScreen';

export const accreditationApprovalReviewStyles = {
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  screenContainer: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
};

/**
 * Single accreditation approval UX: company header, read-only submission, feedback + actions at bottom.
 * Used from Manager Hub pending list and email magic links.
 */
export default function AccreditationApprovalReview({
  companyId,
  companyName,
  stageLabel,
  notes,
  onNotesChange,
  error,
  submitting,
  onRequestChanges,
  onApprove,
  onBack,
  styles = accreditationApprovalReviewStyles,
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}
      >
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 8 }}>
            <Text style={{ color: '#3B82F6', fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
          {companyName}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4, lineHeight: 20 }}>
          Review the accreditation submission below, then approve or request changes
          {stageLabel ? ` as the assigned ${stageLabel} approver` : ''}.
        </Text>
      </View>

      {companyId ? (
        <View style={{ flex: 1, minHeight: 0 }}>
          <CompanyAccreditationScreen
            key={companyId}
            companyId={companyId}
            approverReviewMode
            styles={styles}
          />
        </View>
      ) : null}

      <View style={{
        flexShrink: 0,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
      }}
      >
        {error ? (
          <View style={{
            backgroundColor: '#FEF2F2',
            borderColor: '#FECACA',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
          >
            <Text style={{ color: '#B91C1C' }}>{error}</Text>
          </View>
        ) : null}

        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
          Feedback (required if requesting changes)
        </Text>
        <TextInput
          value={notes}
          onChangeText={onNotesChange}
          placeholder="Enter any comments or required changes..."
          multiline
          style={{
            minHeight: 88,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            padding: 12,
            marginBottom: 14,
            textAlignVertical: 'top',
            fontSize: 14,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={onRequestChanges}
            disabled={submitting}
            style={{
              flex: 1,
              backgroundColor: '#F59E0B',
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>
              {submitting ? 'Processing...' : 'Request Changes'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onApprove}
            disabled={submitting}
            style={{
              flex: 1,
              backgroundColor: '#10B981',
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>
              {submitting ? 'Processing...' : 'Approve'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

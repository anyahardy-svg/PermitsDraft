import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  getAccreditationApprovalByToken,
  submitAccreditationApprovalAction,
} from '../api/accreditationApproval';

export default function AccreditationApprovalScreen({ token }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setError('Missing approval link token.');
        setLoading(false);
        return;
      }

      try {
        const data = await getAccreditationApprovalByToken(token);
        if (!cancelled) {
          setContext(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load approval request.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAction = async (action) => {
    if (!token || submitting) {
      return;
    }

    if (action === 'reject' && !notes.trim()) {
      setError('Please enter feedback explaining what changes are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await submitAccreditationApprovalAction({
        token,
        action,
        notes: notes.trim() || null,
      });

      if (action === 'approve') {
        if (result.status === 'pending_hs') {
          setResultMessage('Thank you. The accreditation has been approved and forwarded to the H&S reviewer.');
        } else if (result.status === 'approved') {
          setResultMessage('Thank you. The accreditation has been fully approved and the company has been notified.');
        } else {
          setResultMessage('Thank you. Your approval has been recorded.');
        }
      } else {
        setResultMessage('The company has been notified that changes are required.');
      }
      setContext(null);
    } catch (actionError) {
      setError(actionError.message || 'Failed to process your response.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: '#4B5563' }}>Loading approval request...</Text>
      </View>
    );
  }

  if (resultMessage) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F9FAFB' }}>
        <View style={{ maxWidth: 520, width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#065F46', marginBottom: 12 }}>Done</Text>
          <Text style={{ fontSize: 16, color: '#374151', lineHeight: 24 }}>{resultMessage}</Text>
        </View>
      </View>
    );
  }

  if (error && !context) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F9FAFB' }}>
        <View style={{ maxWidth: 520, width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#B91C1C', marginBottom: 12 }}>Unable to open link</Text>
          <Text style={{ fontSize: 16, color: '#374151', lineHeight: 24 }}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
      <View style={{ maxWidth: 640, width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          Accreditation approval
        </Text>
        <Text style={{ fontSize: 16, color: '#4B5563', marginBottom: 20, lineHeight: 24 }}>
          Review the accreditation submission for <Text style={{ fontWeight: '700' }}>{context?.company?.name}</Text> as the assigned {context?.stageLabel} approver.
        </Text>

        {error ? (
          <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#B91C1C' }}>{error}</Text>
          </View>
        ) : null}

        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
          Feedback (required if requesting changes)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter any comments or required changes..."
          multiline
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            textAlignVertical: 'top',
            fontSize: 14,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => handleAction('reject')}
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
            onPress={() => handleAction('approve')}
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
    </ScrollView>
  );
}

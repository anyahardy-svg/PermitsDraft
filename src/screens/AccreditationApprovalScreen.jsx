import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  getAccreditationApprovalByToken,
  submitAccreditationApprovalAction,
} from '../api/accreditationApproval';
import AccreditationApprovalReview from './AccreditationApprovalReview';

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
        <Text style={{ marginTop: 12, color: '#4B5563', textAlign: 'center' }}>Loading approval request…</Text>
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

  const companyId = context?.company?.id;

  return (
    <AccreditationApprovalReview
      companyId={companyId}
      companyName={context?.company?.name}
      stageLabel={context?.stageLabel}
      notes={notes}
      onNotesChange={setNotes}
      error={error}
      submitting={submitting}
      onRequestChanges={() => handleAction('reject')}
      onApprove={() => handleAction('approve')}
    />
  );
}

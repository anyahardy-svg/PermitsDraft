import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { listPendingAccreditationApprovals } from '../../api/managerHub';
import { submitAccreditationApprovalAction } from '../../api/accreditationApproval';
import AccreditationApprovalReview, { accreditationApprovalReviewStyles } from '../AccreditationApprovalReview';

export default function ManagerApprovalsPanel({ adminUser, onBack, styles }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [managerApprovals, setManagerApprovals] = useState([]);
  const [hsApprovals, setHsApprovals] = useState([]);
  const [notes, setNotes] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);

  const reviewStyles = styles?.container ? styles : accreditationApprovalReviewStyles;

  const loadApprovals = useCallback(async () => {
    if (!adminUser?.id) {
      setManagerApprovals([]);
      setHsApprovals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await listPendingAccreditationApprovals(adminUser.id);
      setManagerApprovals(result.managerApprovals || []);
      setHsApprovals(result.hsApprovals || []);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      Alert.alert('Error', error.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, [adminUser?.id]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const openReview = (company, stage) => {
    setNotes('');
    setActionError('');
    setSelectedReview({ company, stage });
  };

  const closeReview = () => {
    setSelectedReview(null);
    setNotes('');
    setActionError('');
  };

  const handleAction = async (action) => {
    if (!selectedReview || submitting) {
      return;
    }

    const { company, stage } = selectedReview;
    if (action === 'reject' && !notes.trim()) {
      setActionError('Please enter feedback before requesting changes.');
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      await submitAccreditationApprovalAction({
        companyId: company.id,
        stage,
        action,
        notes: notes.trim() || null,
        adminUserId: adminUser.id,
      });
      Alert.alert(
        'Success',
        action === 'approve'
          ? (stage === 'manager' ? 'Forwarded to H&S for approval.' : 'Accreditation approved and company notified.')
          : 'Company notified that changes are required.',
      );
      closeReview();
      await loadApprovals();
    } catch (error) {
      setActionError(error.message || 'Failed to process approval');
    } finally {
      setSubmitting(false);
    }
  };

  const renderListRow = (company, stage) => (
    <TouchableOpacity
      key={`${stage}-${company.id}`}
      onPress={() => openReview(company, stage)}
      style={{
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{company.name}</Text>
        <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {company.stageLabel} approval • {company.statusLabel}
        </Text>
      </View>
      <Text style={{ fontSize: 22, color: '#9CA3AF', marginLeft: 8 }}>›</Text>
    </TouchableOpacity>
  );

  if (selectedReview) {
    const { company, stage } = selectedReview;
    return (
      <AccreditationApprovalReview
        companyId={company.id}
        companyName={company.name}
        stageLabel={company.stageLabel || (stage === 'manager' ? 'Manager' : 'Health & Safety')}
        notes={notes}
        onNotesChange={setNotes}
        error={actionError}
        submitting={submitting}
        onRequestChanges={() => handleAction('reject')}
        onApprove={() => handleAction('approve')}
        onBack={closeReview}
        styles={reviewStyles}
      />
    );
  }

  const totalPending = managerApprovals.length + hsApprovals.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: 'white' }}>
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 8 }}>
          <Text style={{ color: '#3B82F6', fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Pending Approvals</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
          {totalPending} accreditation{totalPending === 1 ? '' : 's'} awaiting your action
        </Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8, lineHeight: 18 }}>
          Tap a company to review the submission and approve or request changes (same as the email approval link).
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {totalPending === 0 ? (
            <Text style={{ color: '#6B7280', fontSize: 15 }}>No pending accreditation approvals.</Text>
          ) : (
            <>
              {managerApprovals.length > 0 && (
                <>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8 }}>Manager approvals</Text>
                  {managerApprovals.map((company) => renderListRow(company, 'manager'))}
                </>
              )}
              {hsApprovals.length > 0 && (
                <>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: managerApprovals.length ? 12 : 0 }}>H&S approvals</Text>
                  {hsApprovals.map((company) => renderListRow(company, 'hs'))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

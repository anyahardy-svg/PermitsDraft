import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { listPendingAccreditationApprovals } from '../../api/managerHub';
import { submitAccreditationApprovalAction } from '../../api/accreditationApproval';
import CompanyAccreditationScreen from '../CompanyAccreditationScreen';

export default function ManagerApprovalsPanel({ adminUser, onBack, styles }) {
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState('');
  const [managerApprovals, setManagerApprovals] = useState([]);
  const [hsApprovals, setHsApprovals] = useState([]);
  const [feedbackByCompanyId, setFeedbackByCompanyId] = useState({});
  const [reviewCompany, setReviewCompany] = useState(null);

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

  const handleAction = async (company, stage, action) => {
    const notes = feedbackByCompanyId[company.id] || '';
    if (action === 'reject' && !notes.trim()) {
      Alert.alert('Feedback required', 'Please enter feedback before requesting changes.');
      return;
    }

    setSubmittingId(`${company.id}-${action}`);
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
          : 'Company notified that changes are required.'
      );
      await loadApprovals();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process approval');
    } finally {
      setSubmittingId('');
    }
  };

  const renderApprovalCard = (company, stage) => {
    const isSubmitting = submittingId.startsWith(`${company.id}-`);
    return (
      <View
        key={`${stage}-${company.id}`}
        style={{
          backgroundColor: 'white',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          padding: 16,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{company.name}</Text>
        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
          {company.stageLabel} approval • {company.statusLabel}
        </Text>
        <TouchableOpacity
          onPress={() => setReviewCompany(company)}
          style={{
            backgroundColor: '#EFF6FF',
            borderWidth: 1,
            borderColor: '#BFDBFE',
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>View full submission</Text>
        </TouchableOpacity>
        <TextInput
          value={feedbackByCompanyId[company.id] || ''}
          onChangeText={(text) => setFeedbackByCompanyId((prev) => ({ ...prev, [company.id]: text }))}
          placeholder="Feedback (required if requesting changes)"
          multiline
          style={{
            minHeight: 80,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
            textAlignVertical: 'top',
          }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#F59E0B',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            disabled={isSubmitting}
            onPress={() => handleAction(company, stage, 'reject')}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Request Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#10B981',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            disabled={isSubmitting}
            onPress={() => handleAction(company, stage, 'approve')}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          Based on companies where you are the assigned manager or H&S approver (all sites — not limited to the site selected on the hub dashboard).
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
                  {managerApprovals.map((company) => renderApprovalCard(company, 'manager'))}
                </>
              )}
              {hsApprovals.length > 0 && (
                <>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: managerApprovals.length ? 12 : 0 }}>H&amp;S approvals</Text>
                  {hsApprovals.map((company) => renderApprovalCard(company, 'hs'))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!reviewCompany}
        animationType="slide"
        onRequestClose={() => setReviewCompany(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{
            backgroundColor: '#1D4ED8',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                {reviewCompany?.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#DBEAFE', marginTop: 4 }}>
                Accreditation submission (read-only)
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReviewCompany(null)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 24, color: '#FFFFFF', fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          </View>
          {reviewCompany ? (
            <CompanyAccreditationScreen
              key={reviewCompany.id}
              companyId={reviewCompany.id}
              approverReviewMode
              styles={styles}
              onClose={() => setReviewCompany(null)}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

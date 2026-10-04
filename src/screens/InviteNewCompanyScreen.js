import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { getAllAdminUsers } from '../api/adminAuth';
import { inviteNewCompany } from '../api/inviteCompanyApi';
import { getDefaultAccreditationDeadline } from '../utils/accreditation';
import { buildInviteCompanyUrl, parseInviteCompanyLinkParams } from '../utils/inviteCompanyRoute';

const emptyForm = () => ({
  companyName: '',
  email: '',
  contactName: '',
  deadline: getDefaultAccreditationDeadline(),
  contractor_type: 'D',
  assignedManagerId: '',
  assignedHsPersonId: '',
});

export default function InviteNewCompanyScreen({
  mode = 'public',
  siteId = null,
  siteName = '',
  inviteLinkParams = null,
  loggedInAdmin = null,
  onBack,
  onSuccess,
  styles: parentStyles,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [linkAssigneeLabels, setLinkAssigneeLabels] = useState({
    managerName: '',
    hsPersonName: '',
  });

  const isManagerMode = mode === 'manager';
  const showAssigneeFields = isManagerMode && loggedInAdmin?.id;

  const resolvedSiteId = siteId || inviteLinkParams?.siteId || null;

  const lookupAdminName = useCallback(
    (adminId) => {
      if (!adminId) {
        return '';
      }
      const match = adminUsers.find((user) => user.id === adminId);
      return match?.name || '';
    },
    [adminUsers],
  );

  const shareableLink = useMemo(() => {
    const managerId = form.assignedManagerId || null;
    const hsPersonId = form.assignedHsPersonId || null;
    return buildInviteCompanyUrl({
      siteId: resolvedSiteId || undefined,
      assignedManagerId: managerId || undefined,
      assignedHsPersonId: hsPersonId || undefined,
      assignedManagerName: lookupAdminName(managerId) || undefined,
      assignedHsPersonName: lookupAdminName(hsPersonId) || undefined,
    });
  }, [
    form.assignedHsPersonId,
    form.assignedManagerId,
    lookupAdminName,
    resolvedSiteId,
  ]);

  useEffect(() => {
    if (isManagerMode) {
      return;
    }

    const fromProps = inviteLinkParams || {};
    const fromWindow =
      typeof window !== 'undefined'
        ? parseInviteCompanyLinkParams(window.location.search)
        : null;
    const merged = {
      siteId: fromProps.siteId || fromWindow?.siteId || null,
      assignedManagerId: fromProps.assignedManagerId || fromWindow?.assignedManagerId || '',
      assignedHsPersonId: fromProps.assignedHsPersonId || fromWindow?.assignedHsPersonId || '',
      assignedManagerName: fromProps.assignedManagerName || fromWindow?.assignedManagerName || '',
      assignedHsPersonName: fromProps.assignedHsPersonName || fromWindow?.assignedHsPersonName || '',
    };

    if (
      merged.assignedManagerId
      || merged.assignedHsPersonId
      || merged.assignedManagerName
      || merged.assignedHsPersonName
    ) {
      setForm((prev) => ({
        ...prev,
        assignedManagerId: merged.assignedManagerId || prev.assignedManagerId,
        assignedHsPersonId: merged.assignedHsPersonId || prev.assignedHsPersonId,
      }));
      setLinkAssigneeLabels({
        managerName: merged.assignedManagerName || '',
        hsPersonName: merged.assignedHsPersonName || '',
      });
    }
  }, [inviteLinkParams, isManagerMode]);

  useEffect(() => {
    if (!showAssigneeFields) {
      return;
    }

    let cancelled = false;
    setLoadingAdmins(true);
    getAllAdminUsers(loggedInAdmin.id)
      .then((users) => {
        if (!cancelled) {
          setAdminUsers(users || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdminUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAdmins(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loggedInAdmin?.id, showAssigneeFields]);

  useEffect(() => {
    if (!loggedInAdmin?.id || form.assignedManagerId) {
      return;
    }
    if (loggedInAdmin.role === 'manager') {
      setForm((prev) => ({ ...prev, assignedManagerId: loggedInAdmin.id }));
    }
  }, [loggedInAdmin, form.assignedManagerId]);

  const inputStyle = parentStyles?.input || {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  };

  const labelStyle = parentStyles?.label || {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  };

  const handleSubmit = async () => {
    if (!form.companyName.trim()) {
      Alert.alert('Missing info', 'Please enter a company name.');
      return;
    }
    if (!form.email.trim()) {
      Alert.alert('Missing info', 'Please enter a contact email.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await inviteNewCompany({
        companyName: form.companyName,
        email: form.email,
        contactName: form.contactName,
        contractor_type: form.contractor_type,
        deadline: form.deadline,
        siteId: resolvedSiteId,
        assignedManagerId: form.assignedManagerId || null,
        assignedHsPersonId: form.assignedHsPersonId || null,
        includeAdminSession: isManagerMode,
      });

      Alert.alert(
        'Success',
        result.emailSent === false
          ? 'Company was created but the invitation email could not be sent. You can resend from the admin companies list.'
          : 'Company created and accreditation invitation sent.',
      );

      setForm(emptyForm());
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to invite company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareableLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        return;
      } catch {
        // fall through
      }
    }
    Alert.alert('Share link', shareableLink);
  }, [shareableLink]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, maxWidth: 640, alignSelf: 'center', width: '100%' }}
    >
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#2563EB', fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
        Invite New Company
      </Text>
      <Text style={{ color: '#6B7280', marginBottom: 16, lineHeight: 20 }}>
        {isManagerMode
          ? `Create a new contractor company and email them an accreditation invitation${siteName ? ` for ${siteName}` : ''}.`
          : 'Submit your company details to receive an accreditation invitation by email.'}
      </Text>

      {isManagerMode ? (
        <View
          style={{
            backgroundColor: '#EEF2FF',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#C7D2FE',
          }}
        >
          <Text style={{ fontWeight: '600', color: '#312E81', marginBottom: 6 }}>Standalone link</Text>
          <Text style={{ color: '#4338CA', fontSize: 13, marginBottom: 10 }} selectable>
            {shareableLink}
          </Text>
          <TouchableOpacity
            onPress={handleCopyLink}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#4F46E5',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
              {copiedLink ? 'Copied!' : 'Copy link for anyone to use'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!isManagerMode && (linkAssigneeLabels.managerName || linkAssigneeLabels.hsPersonName) ? (
        <View
          style={{
            backgroundColor: '#F0FDF4',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}
        >
          <Text style={{ fontWeight: '600', color: '#14532D', marginBottom: 6 }}>Accreditation approvals</Text>
          {linkAssigneeLabels.managerName ? (
            <Text style={{ color: '#166534', fontSize: 14 }}>
              Site manager: {linkAssigneeLabels.managerName}
            </Text>
          ) : null}
          {linkAssigneeLabels.hsPersonName ? (
            <Text style={{ color: '#166534', fontSize: 14, marginTop: 4 }}>
              H&amp;S person: {linkAssigneeLabels.hsPersonName}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={labelStyle}>Company name *</Text>
      <TextInput
        style={inputStyle}
        value={form.companyName}
        onChangeText={(text) => setForm({ ...form, companyName: text })}
        placeholder="Company name"
        editable={!submitting}
      />

      <Text style={labelStyle}>Contact email *</Text>
      <TextInput
        style={inputStyle}
        value={form.email}
        onChangeText={(text) => setForm({ ...form, email: text })}
        placeholder="name@company.co.nz"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!submitting}
      />

      <Text style={labelStyle}>Contact name</Text>
      <TextInput
        style={inputStyle}
        value={form.contactName}
        onChangeText={(text) => setForm({ ...form, contactName: text })}
        placeholder="Optional"
        editable={!submitting}
      />

      <Text style={labelStyle}>Contractor type</Text>
      <View style={{ marginBottom: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
        {Platform.OS === 'web' ? (
          <select
            style={{ padding: 12, fontSize: 14, width: '100%', height: 44 }}
            value={form.contractor_type}
            onChange={(event) => setForm({ ...form, contractor_type: event.target.value })}
            disabled={submitting}
          >
            <option value="A">A - Major Work</option>
            <option value="B">B - High Risk</option>
            <option value="C">C - Medium Risk</option>
            <option value="D">D - Low Risk</option>
          </select>
        ) : (
          <TextInput
            style={inputStyle}
            value={form.contractor_type}
            onChangeText={(text) => setForm({ ...form, contractor_type: text })}
            editable={!submitting}
          />
        )}
      </View>

      <Text style={labelStyle}>Accreditation deadline</Text>
      <TextInput
        style={inputStyle}
        value={form.deadline}
        onChangeText={(text) => setForm({ ...form, deadline: text })}
        placeholder="DD/MM/YYYY"
        editable={!submitting}
      />

      {showAssigneeFields ? (
        loadingAdmins ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
        ) : (
          <>
            <Text style={labelStyle}>Assigned manager (optional)</Text>
            <View style={{ marginBottom: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
              <select
                style={{ padding: 12, fontSize: 14, width: '100%', height: 44 }}
                value={form.assignedManagerId || ''}
                onChange={(event) => setForm({ ...form, assignedManagerId: event.target.value })}
                disabled={submitting}
              >
                <option value="">Select manager…</option>
                {adminUsers.map((admin) => (
                  <option key={`invite-company-manager-${admin.id}`} value={admin.id}>
                    {admin.name} ({admin.email}) - {admin.role}
                  </option>
                ))}
              </select>
            </View>

            <Text style={labelStyle}>Assigned H&amp;S person (optional)</Text>
            <View style={{ marginBottom: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
              <select
                style={{ padding: 12, fontSize: 14, width: '100%', height: 44 }}
                value={form.assignedHsPersonId || ''}
                onChange={(event) => setForm({ ...form, assignedHsPersonId: event.target.value })}
                disabled={submitting}
              >
                <option value="">Select H&amp;S person…</option>
                {adminUsers.map((admin) => (
                  <option key={`invite-company-hs-${admin.id}`} value={admin.id}>
                    {admin.name} ({admin.email}) - {admin.role}
                  </option>
                ))}
              </select>
            </View>
          </>
        )
      ) : null}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? '#9CA3AF' : '#8B5CF6',
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
          {submitting ? 'Sending invitation…' : '+ Create & Invite'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

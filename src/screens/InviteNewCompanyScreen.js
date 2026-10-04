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
import { getAllAdminUsers, listAdminUsersForKioskSite } from '../api/adminAuth';
import { fetchInviteCompanyApprovers, inviteNewCompany } from '../api/inviteCompanyApi';
import { getDefaultAccreditationDeadline } from '../utils/accreditation';
import { buildInviteCompanyUrl, parseInviteCompanyLinkParams } from '../utils/inviteCompanyRoute';
import PublicFormLayout from '../components/PublicFormLayout';
import { PUBLIC_PAGE_THEME } from '../constants/contractorHQBrand';

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
  const [approversError, setApproversError] = useState('');
  const [assigneesLockedFromLink, setAssigneesLockedFromLink] = useState(false);
  const [linkAssigneeNames, setLinkAssigneeNames] = useState({
    managerName: '',
    hsPersonName: '',
  });

  const isManagerMode = mode === 'manager';

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
      if (merged.assignedManagerId || merged.assignedHsPersonId) {
        setAssigneesLockedFromLink(true);
      }
      setLinkAssigneeNames({
        managerName: merged.assignedManagerName || '',
        hsPersonName: merged.assignedHsPersonName || '',
      });
    }
  }, [inviteLinkParams, isManagerMode]);

  const approverOptions = useMemo(() => {
    const byId = new Map((adminUsers || []).map((user) => [user.id, user]));

    const ensureOption = (id, name, fallbackLabel) => {
      if (!id) {
        return;
      }
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: name || fallbackLabel,
          email: '',
          role: '',
        });
      }
    };

    ensureOption(form.assignedManagerId, linkAssigneeNames.managerName, 'Approval manager');
    ensureOption(form.assignedHsPersonId, linkAssigneeNames.hsPersonName, 'H&S advisor');

    return Array.from(byId.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
    );
  }, [
    adminUsers,
    form.assignedHsPersonId,
    form.assignedManagerId,
    linkAssigneeNames.hsPersonName,
    linkAssigneeNames.managerName,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadApprovers() {
      setLoadingAdmins(true);
      setApproversError('');
      try {
        let users = [];
        if (isManagerMode && loggedInAdmin?.id) {
          if (resolvedSiteId) {
            users = await listAdminUsersForKioskSite(resolvedSiteId);
          } else {
            users = await getAllAdminUsers(loggedInAdmin.id);
          }
        } else if (resolvedSiteId) {
          const result = await fetchInviteCompanyApprovers(resolvedSiteId);
          users = result.approvers || [];
        }
        if (!cancelled) {
          setAdminUsers(users);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAdminUsers([]);
          setApproversError(loadError?.message || 'Could not load approval contacts');
        }
      } finally {
        if (!cancelled) {
          setLoadingAdmins(false);
        }
      }
    }

    loadApprovers();

    return () => {
      cancelled = true;
    };
  }, [isManagerMode, loggedInAdmin?.id, resolvedSiteId]);

  useEffect(() => {
    if (!loggedInAdmin?.id || form.assignedManagerId) {
      return;
    }
    if (loggedInAdmin.role === 'manager') {
      setForm((prev) => ({ ...prev, assignedManagerId: loggedInAdmin.id }));
    }
  }, [loggedInAdmin, form.assignedManagerId]);

  const theme = PUBLIC_PAGE_THEME;

  const inputStyle = parentStyles?.input || {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
    fontSize: 15,
  };

  const labelStyle = parentStyles?.label || {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
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

  const pageTitle = 'Invite new company';
  const pageSubtitle = isManagerMode
    ? `Create a contractor company and send an accreditation invitation${siteName ? ` for ${siteName}` : ''}.`
    : 'Submit your company details and we’ll email you a secure link to complete contractor accreditation.';

  const formBody = (
    <>
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

      <Text style={{ ...labelStyle, marginTop: 0 }}>Company name *</Text>
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

      <Text style={{ ...labelStyle, fontSize: 15, color: '#0F172A' }}>Accreditation approvals</Text>
      <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8, lineHeight: 18 }}>
        Choose who will approve this company&apos;s accreditation after they submit.
      </Text>
      {!resolvedSiteId ? (
        <Text style={{ fontSize: 13, color: '#B45309', marginBottom: 12, lineHeight: 18 }}>
          Use a site-specific invite link from your site manager to pick approval manager and H&amp;S advisor here.
        </Text>
      ) : null}
      {approversError ? (
        <Text style={{ fontSize: 13, color: '#B91C1C', marginBottom: 12 }}>{approversError}</Text>
      ) : null}
      {loadingAdmins ? (
        <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
      ) : (
        <>
          <Text style={labelStyle}>Approval manager (optional)</Text>
          <View style={{ marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            {Platform.OS === 'web' ? (
              <select
                style={{
                  padding: 12,
                  fontSize: 14,
                  width: '100%',
                  height: 44,
                  backgroundColor: assigneesLockedFromLink ? '#F1F5F9' : '#F8FAFC',
                }}
                value={form.assignedManagerId || ''}
                onChange={(event) => setForm({ ...form, assignedManagerId: event.target.value })}
                disabled={submitting || !resolvedSiteId || assigneesLockedFromLink}
              >
                <option value="">Select approval manager…</option>
                {approverOptions.map((admin) => (
                  <option key={`invite-company-manager-${admin.id}`} value={admin.id}>
                    {admin.email
                      ? `${admin.name} (${admin.email})${admin.role ? ` — ${admin.role}` : ''}`
                      : admin.name}
                  </option>
                ))}
              </select>
            ) : (
              <TextInput
                style={inputStyle}
                value={form.assignedManagerId}
                onChangeText={(text) => setForm({ ...form, assignedManagerId: text })}
                editable={!submitting && Boolean(resolvedSiteId) && !assigneesLockedFromLink}
                placeholder="Manager admin user ID"
              />
            )}
          </View>

          <Text style={labelStyle}>Approval H&amp;S advisor (optional)</Text>
          <View style={{ marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            {Platform.OS === 'web' ? (
              <select
                style={{
                  padding: 12,
                  fontSize: 14,
                  width: '100%',
                  height: 44,
                  backgroundColor: assigneesLockedFromLink ? '#F1F5F9' : '#F8FAFC',
                }}
                value={form.assignedHsPersonId || ''}
                onChange={(event) => setForm({ ...form, assignedHsPersonId: event.target.value })}
                disabled={submitting || !resolvedSiteId || assigneesLockedFromLink}
              >
                <option value="">Select H&amp;S advisor…</option>
                {approverOptions.map((admin) => (
                  <option key={`invite-company-hs-${admin.id}`} value={admin.id}>
                    {admin.email
                      ? `${admin.name} (${admin.email})${admin.role ? ` — ${admin.role}` : ''}`
                      : admin.name}
                  </option>
                ))}
              </select>
            ) : (
              <TextInput
                style={inputStyle}
                value={form.assignedHsPersonId}
                onChangeText={(text) => setForm({ ...form, assignedHsPersonId: text })}
                editable={!submitting && Boolean(resolvedSiteId) && !assigneesLockedFromLink}
                placeholder="H&S advisor admin user ID"
              />
            )}
          </View>
          {assigneesLockedFromLink ? (
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
              Approvers were preset on your invite link and cannot be changed here.
            </Text>
          ) : null}
        </>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? '#94A3B8' : theme.accent,
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginTop: 20,
          ...(Platform.OS === 'web'
            ? { boxShadow: submitting ? undefined : '0 10px 24px rgba(79, 70, 229, 0.35)' }
            : null),
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
          {submitting ? 'Sending invitation…' : 'Create company & send invite'}
        </Text>
      </TouchableOpacity>
    </>
  );

  if (isManagerMode) {
    return (
      <PublicFormLayout compact title={pageTitle} subtitle={pageSubtitle}>
        {formBody}
      </PublicFormLayout>
    );
  }

  return (
    <PublicFormLayout title={pageTitle} subtitle={pageSubtitle}>
      {formBody}
    </PublicFormLayout>
  );
}

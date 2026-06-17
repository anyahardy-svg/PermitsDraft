import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';

import {
  createSupplier,
  deleteSupplier,
  getAllSuppliers,
  inviteSupplier,
  sendInvitationToSupplier,
} from '../api/supplierApi';
import { getDefaultAccreditationDeadline } from '../utils/accreditation';
import {
  getSupplierAccreditationStatusDisplay,
  resolveSupplierAccreditationDisplayStatus,
} from '../utils/supplierAccreditation';

const RISK_COLORS = {
  Critical: { backgroundColor: '#FCA5A5', color: '#7F1D1D' },
  High: { backgroundColor: '#FED7AA', color: '#92400E' },
  Medium: { backgroundColor: '#C7D2FE', color: '#3730A3' },
  Low: { backgroundColor: '#DBEAFE', color: '#0C4A6E' },
};

const STATUS_COLORS = {
  draft: { backgroundColor: '#FEF3C7', color: '#92400E' },
  reviewing: { backgroundColor: '#E0E7FF', color: '#3730A3' },
  approved: { backgroundColor: '#D1FAE5', color: '#065F46' },
  trial_required: { backgroundColor: '#FEF3C7', color: '#92400E' },
  rejected: { backgroundColor: '#FEE2E2', color: '#7F1D1D' },
  active: { backgroundColor: '#D1FAE5', color: '#065F46' },
  inactive: { backgroundColor: '#F3F4F6', color: '#6B7280' },
};

const RISK_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

function formatDate(dateString) {
  if (!dateString) {
    return '—';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function parseDateToISO(dateString) {
  if (!dateString) {
    return null;
  }

  const match = String(dateString).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

function findColumnIndex(headers, matchers) {
  return headers.findIndex((header) => matchers.some((matcher) => matcher(header)));
}

export default function SupplierListScreen({ onOpenForm, styles }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSendInvitationModal, setShowSendInvitationModal] = useState(false);
  const [selectedSupplierForInvitation, setSelectedSupplierForInvitation] = useState(null);
  const [creatingAndSendingInvitation, setCreatingAndSendingInvitation] = useState(false);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    companyName: '',
    email: '',
    techContactName: '',
    riskClassification: '',
    deadline: getDefaultAccreditationDeadline(),
  });
  const [sendInvitationForm, setSendInvitationForm] = useState({
    email: '',
    techContactName: '',
    deadline: getDefaultAccreditationDeadline(),
  });
  const [importStatus, setImportStatus] = useState('idle');
  const [importMessage, setImportMessage] = useState('');
  const [deletingSupplierId, setDeletingSupplierId] = useState(null);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSuppliers();
      setSuppliers(data);
    } catch (loadError) {
      console.error('Failed to load suppliers:', loadError);
      setError(loadError?.message || 'Failed to load suppliers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchText) {
      return true;
    }

    const query = searchText.toLowerCase();
    return (
      supplier.company_name?.toLowerCase().includes(query)
      || supplier.contact_email?.toLowerCase().includes(query)
    );
  });

  const handleOpenForm = (supplierId) => {
    if (onOpenForm) {
      onOpenForm(supplierId);
    }
  };

  const confirmDeleteSupplier = (supplier) => {
    const message = `Delete "${supplier.company_name}"? This will permanently remove the supplier and their accreditation data. This cannot be undone.`;

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Delete Supplier',
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ],
      );
    });
  };

  const handleDeleteSupplier = async (supplier) => {
    const confirmed = await confirmDeleteSupplier(supplier);
    if (!confirmed) {
      return;
    }

    setDeletingSupplierId(supplier.id);
    try {
      await deleteSupplier(supplier.id);
      Alert.alert('Success', 'Supplier deleted successfully.');
      await loadSuppliers();
    } catch (deleteError) {
      Alert.alert('Error', deleteError?.message || 'Failed to delete supplier.');
    } finally {
      setDeletingSupplierId(null);
    }
  };

  const openInviteModal = () => {
    setInviteForm({
      companyName: '',
      email: '',
      techContactName: '',
      riskClassification: '',
      deadline: getDefaultAccreditationDeadline(),
    });
    setShowInviteModal(true);
  };

  const openSendInvitationModal = (supplier) => {
    setSelectedSupplierForInvitation(supplier);
    setSendInvitationForm({
      email: supplier.contact_email || '',
      techContactName: supplier.tech_contact_name || '',
      deadline: supplier.accreditation_deadline
        ? formatDate(supplier.accreditation_deadline)
        : getDefaultAccreditationDeadline(),
    });
    setShowSendInvitationModal(true);
  };

  const handleSendInvitation = async () => {
    if (!sendInvitationForm.email.trim()) {
      Alert.alert('Missing Info', 'Please enter a contact email.');
      return;
    }

    if (!selectedSupplierForInvitation) {
      return;
    }

    setSendingInvitation(true);
    try {
      let deadline = null;
      if (sendInvitationForm.deadline.trim()) {
        const [day, month, year] = sendInvitationForm.deadline.split('/');
        if (day && month && year) {
          deadline = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        }
      }

      await sendInvitationToSupplier({
        supplierId: selectedSupplierForInvitation.id,
        email: sendInvitationForm.email.trim(),
        companyName: selectedSupplierForInvitation.company_name,
        deadline,
        techContactName: sendInvitationForm.techContactName.trim() || null,
      });

      Alert.alert('Success', 'Supplier invitation sent successfully!');
      setShowSendInvitationModal(false);
      setSelectedSupplierForInvitation(null);
      await loadSuppliers();
    } catch (inviteError) {
      Alert.alert('Error', inviteError?.message || 'Failed to send invitation.');
    } finally {
      setSendingInvitation(false);
    }
  };

  const handleCreateAndInvite = async () => {
    if (!inviteForm.companyName.trim()) {
      Alert.alert('Missing Info', 'Please enter a company name.');
      return;
    }
    if (!inviteForm.email.trim()) {
      Alert.alert('Missing Info', 'Please enter a contact email.');
      return;
    }

    setCreatingAndSendingInvitation(true);
    try {
      let deadline = null;
      if (inviteForm.deadline.trim()) {
        const [day, month, year] = inviteForm.deadline.split('/');
        if (day && month && year) {
          deadline = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        }
      }

      const result = await inviteSupplier({
        companyName: inviteForm.companyName.trim(),
        email: inviteForm.email.trim(),
        techContactName: inviteForm.techContactName.trim() || null,
        riskClassification: inviteForm.riskClassification || null,
        deadline,
      });

      if (result.emailSent) {
        Alert.alert('Success', 'Supplier created and invitation sent successfully!');
        setShowInviteModal(false);
      } else {
        Alert.alert('Partial Success', result.warning || 'Supplier was created but the invitation failed to send.');
      }

      await loadSuppliers();
    } catch (inviteError) {
      Alert.alert('Error', inviteError?.message || 'Failed to create supplier or send invitation.');
    } finally {
      setCreatingAndSendingInvitation(false);
    }
  };

  const handleImportCSV = () => {
    if (typeof document === 'undefined') {
      Alert.alert('Unavailable', 'CSV import is only available on web.');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xlsx,.xls';

    fileInput.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = async (readEvent) => {
        try {
          setImportStatus('importing');
          setImportMessage('Reading CSV file...');

          const csvText = readEvent.target.result;
          const lines = csvText.trim().split('\n');

          if (lines.length < 2) {
            setImportStatus('error');
            setImportMessage('File must have a header row and at least one data row.');
            setTimeout(() => setImportStatus('idle'), 5000);
            return;
          }

          setImportMessage('Parsing CSV columns...');
          const headerValues = parseCsvLine(lines[0]).map((value) => value.toLowerCase());

          const nameIdx = findColumnIndex(headerValues, [
            (header) => header.includes('company') && header.includes('name'),
            (header) => header === 'name',
            (header) => header.includes('supplier') && header.includes('name'),
          ]);
          const emailIdx = findColumnIndex(headerValues, [
            (header) => header.includes('email') && !header.includes('contact'),
            (header) => header.includes('contact') && header.includes('email'),
          ]);
          const riskIdx = findColumnIndex(headerValues, [
            (header) => header.includes('risk'),
          ]);
          const techContactIdx = findColumnIndex(headerValues, [
            (header) => header.includes('tech') && header.includes('contact'),
            (header) => header.includes('technical') && header.includes('contact'),
          ]);
          const statusIdx = findColumnIndex(headerValues, [
            (header) => header.includes('status'),
          ]);
          const deadlineIdx = findColumnIndex(headerValues, [
            (header) => header.includes('deadline'),
          ]);

          if (nameIdx < 0) {
            setImportStatus('error');
            setImportMessage('Could not find a company name column in the CSV.');
            setTimeout(() => setImportStatus('idle'), 5000);
            return;
          }

          let newCount = 0;
          let updatedCount = 0;
          let duplicateCount = 0;
          const processedNames = new Set();

          for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
            const line = lines[lineIndex].trim();
            if (!line) {
              continue;
            }

            const values = parseCsvLine(line);
            const companyName = values[nameIdx]?.trim();
            if (!companyName) {
              continue;
            }

            const normalizedName = companyName.toLowerCase();
            if (processedNames.has(normalizedName)) {
              duplicateCount += 1;
              continue;
            }
            processedNames.add(normalizedName);

            const payload = {
              company_name: companyName,
              upsert: true,
            };

            if (emailIdx >= 0 && values[emailIdx]) {
              payload.contact_email = values[emailIdx].trim();
            }
            if (riskIdx >= 0 && values[riskIdx]) {
              payload.risk_classification = values[riskIdx].trim();
            }
            if (techContactIdx >= 0 && values[techContactIdx]) {
              payload.tech_contact_name = values[techContactIdx].trim();
            }
            if (statusIdx >= 0 && values[statusIdx]) {
              payload.status = values[statusIdx].trim();
            }
            if (deadlineIdx >= 0 && values[deadlineIdx]) {
              payload.accreditation_deadline = parseDateToISO(values[deadlineIdx]);
            }

            setImportMessage(`Importing ${lineIndex} of ${lines.length - 1}: ${companyName}...`);
            const saved = await createSupplier(payload);
            if (saved._action === 'updated') {
              updatedCount += 1;
            } else {
              newCount += 1;
            }
          }

          if (newCount === 0 && updatedCount === 0 && duplicateCount === 0) {
            setImportStatus('error');
            setImportMessage('No valid suppliers found in the CSV file.');
            setTimeout(() => setImportStatus('idle'), 5000);
            return;
          }

          await loadSuppliers();

          let message = 'Import complete.';
          if (newCount > 0) {
            message += ` ${newCount} new supplier(s) created.`;
          }
          if (updatedCount > 0) {
            message += ` ${updatedCount} supplier(s) updated.`;
          }
          if (duplicateCount > 0) {
            message += ` ${duplicateCount} duplicate(s) skipped.`;
          }

          setImportStatus('success');
          setImportMessage(message);
          setTimeout(() => setImportStatus('idle'), 5000);
        } catch (importError) {
          console.error('Supplier CSV import error:', importError);
          setImportStatus('error');
          setImportMessage(importError?.message || 'Failed to import CSV file.');
          setTimeout(() => setImportStatus('idle'), 5000);
        }
      };

      reader.readAsText(file);
    };

    fileInput.click();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading suppliers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', padding: 20, margin: 16 }}>
        <Text style={{ color: '#DC2626', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {importStatus !== 'idle' && (
        <View style={{
          backgroundColor: importStatus === 'importing' ? '#DBEAFE' : importStatus === 'success' ? '#DCFCE7' : '#FEE2E2',
          borderWidth: 1,
          borderColor: importStatus === 'importing' ? '#93C5FD' : importStatus === 'success' ? '#86EFAC' : '#FECACA',
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
        >
          <Text style={{
            color: importStatus === 'importing' ? '#1E40AF' : importStatus === 'success' ? '#166534' : '#991B1B',
            fontSize: 13,
            fontWeight: '500',
            textAlign: 'center',
          }}
          >
            {importStatus === 'importing' && '⏳ '}
            {importStatus === 'success' && '✓ '}
            {importStatus === 'error' && '✕ '}
            {importMessage}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles?.label, { marginLeft: 0, fontSize: 16, fontWeight: 'bold' }]}>Suppliers Directory</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8 }}
          onPress={openInviteModal}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>+ Invite New Supplier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8 }}
          onPress={handleImportCSV}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Import CSV/Excel</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles?.input, { paddingHorizontal: 12, paddingVertical: 8, borderColor: '#D1D5DB', marginBottom: 12 }]}
        placeholder="Search suppliers by company name..."
        value={searchText}
        onChangeText={setSearchText}
      />

      <Text style={{ color: '#6B7280', marginBottom: 12 }}>
        Total: {filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? '' : 's'}
      </Text>

      {filteredSuppliers.length === 0 ? (
        <View style={{ backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, alignItems: 'center' }}>
          <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>
            {suppliers.length === 0 ? 'No suppliers added yet' : 'No suppliers match your search.'}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: 'white' }}>
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: '#3B82F6', borderBottomWidth: 2, borderBottomColor: '#2563EB' }}>
              <Text style={{ width: 200, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Company Name</Text>
              <Text style={{ width: 260, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Actions</Text>
              <Text style={{ width: 180, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Contact Email</Text>
              <Text style={{ width: 120, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Risk</Text>
              <Text style={{ width: 100, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Status</Text>
              <Text style={{ width: 130, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Invitation Sent</Text>
              <Text style={{ width: 120, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Deadline</Text>
              <Text style={{ width: 120, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center' }}>Created</Text>
            </View>

            {filteredSuppliers.map((supplier, index) => {
              const riskStyle = RISK_COLORS[supplier.risk_classification] || { backgroundColor: '#F3F4F6', color: '#6B7280' };
              const accreditationStatus = resolveSupplierAccreditationDisplayStatus(supplier);
              const statusDisplay = getSupplierAccreditationStatusDisplay(accreditationStatus);
              const statusStyle = STATUS_COLORS[accreditationStatus] || STATUS_COLORS.draft;
              const deadlineDate = supplier.accreditation_deadline ? new Date(supplier.accreditation_deadline) : null;
              const isOverdue = deadlineDate && deadlineDate < new Date();

              return (
                <View
                  key={supplier.id}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: index % 2 === 0 ? 'white' : '#F3F4F6',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ width: 200, padding: 12, fontSize: 13, color: '#1F2937', borderRightWidth: 1, borderRightColor: '#E5E7EB', fontWeight: '500' }}>
                    {supplier.company_name}
                  </Text>
                  <View style={{ width: 260, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6, padding: 8, borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        backgroundColor: supplier.invitation_sent_at ? '#F59E0B' : '#8B5CF6',
                        borderRadius: 4,
                      }}
                      onPress={() => openSendInvitationModal(supplier)}
                      disabled={deletingSupplierId === supplier.id}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                        {supplier.invitation_sent_at ? '↻ Resend' : '✉ Invite'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#3B82F6', borderRadius: 4 }}
                      onPress={() => handleOpenForm(supplier.id)}
                      disabled={deletingSupplierId === supplier.id}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Open Form</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        backgroundColor: deletingSupplierId === supplier.id ? '#9CA3AF' : '#EF4444',
                        borderRadius: 4,
                      }}
                      onPress={() => handleDeleteSupplier(supplier)}
                      disabled={deletingSupplierId === supplier.id}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                        {deletingSupplierId === supplier.id ? 'Deleting...' : 'Delete'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ width: 180, padding: 12, fontSize: 13, color: '#4B5563', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    {supplier.contact_email || '—'}
                  </Text>
                  <View style={{ width: 120, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: riskStyle.backgroundColor }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: riskStyle.color }}>
                        {supplier.risk_classification || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 100, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: statusStyle.backgroundColor }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: statusStyle.color }}>
                        {statusDisplay.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ width: 130, padding: 12, fontSize: 13, color: '#6B7280', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    {supplier.invitation_sent_at ? formatDate(supplier.invitation_sent_at) : '○ Not sent'}
                  </Text>
                  <Text style={{
                    width: 120,
                    padding: 12,
                    fontSize: 13,
                    color: isOverdue ? '#7F1D1D' : '#6B7280',
                    textAlign: 'center',
                    fontWeight: isOverdue ? '600' : '400',
                    borderRightWidth: 1,
                    borderRightColor: '#E5E7EB',
                  }}
                  >
                    {deadlineDate ? `${isOverdue ? '⚠ ' : ''}${formatDate(supplier.accreditation_deadline)}` : '—'}
                  </Text>
                  <Text style={{ width: 120, padding: 12, fontSize: 13, color: '#4B5563', textAlign: 'center' }}>
                    {formatDate(supplier.created_at)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {showSendInvitationModal && selectedSupplierForInvitation && (
        <Modal
          visible={showSendInvitationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSendInvitationModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>
                Send Supplier Invitation
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
                Supplier:{' '}
                <Text style={{ fontWeight: '600', color: '#1F2937' }}>
                  {selectedSupplierForInvitation.company_name}
                </Text>
              </Text>

              <Text style={[styles?.label, { marginTop: 0 }]}>Contact Email *</Text>
              <TextInput
                style={styles?.input}
                placeholder="Enter email address"
                value={sendInvitationForm.email}
                onChangeText={(text) => setSendInvitationForm({ ...sendInvitationForm, email: text })}
                keyboardType="email-address"
                editable={!sendingInvitation}
              />

              <Text style={styles?.label}>Technical Contact Name</Text>
              <TextInput
                style={styles?.input}
                placeholder="Enter technical contact name"
                value={sendInvitationForm.techContactName}
                onChangeText={(text) => setSendInvitationForm({ ...sendInvitationForm, techContactName: text })}
                editable={!sendingInvitation}
              />

              <Text style={styles?.label}>Submit Form Deadline</Text>
              <TextInput
                style={styles?.input}
                placeholder="DD/MM/YYYY"
                value={sendInvitationForm.deadline}
                onChangeText={(text) => setSendInvitationForm({ ...sendInvitationForm, deadline: text })}
                editable={!sendingInvitation}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  style={[styles?.addButton, { flex: 1, backgroundColor: '#6B7280' }]}
                  onPress={() => setShowSendInvitationModal(false)}
                  disabled={sendingInvitation}
                >
                  <Text style={styles?.addButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles?.addButton, { flex: 1, backgroundColor: sendingInvitation ? '#9CA3AF' : '#8B5CF6' }]}
                  onPress={handleSendInvitation}
                  disabled={sendingInvitation}
                >
                  <Text style={styles?.addButtonText}>
                    {sendingInvitation ? '⏳ Sending...' : '✉ Send Invitation'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showInviteModal && (
        <Modal
          visible={showInviteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>
                Invite New Supplier
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
                Create a new supplier and send an accreditation invitation
              </Text>

              <Text style={[styles?.label, { marginTop: 0 }]}>Company Name *</Text>
              <TextInput
                style={styles?.input}
                placeholder="Enter company name here"
                value={inviteForm.companyName}
                onChangeText={(text) => setInviteForm({ ...inviteForm, companyName: text })}
                editable={!creatingAndSendingInvitation}
              />

              <Text style={styles?.label}>Contact Email *</Text>
              <TextInput
                style={styles?.input}
                placeholder="Enter email address"
                value={inviteForm.email}
                onChangeText={(text) => setInviteForm({ ...inviteForm, email: text })}
                keyboardType="email-address"
                editable={!creatingAndSendingInvitation}
              />

              <Text style={styles?.label}>Technical Contact Name</Text>
              <TextInput
                style={styles?.input}
                placeholder="Enter technical contact name"
                value={inviteForm.techContactName}
                onChangeText={(text) => setInviteForm({ ...inviteForm, techContactName: text })}
                editable={!creatingAndSendingInvitation}
              />

              <Text style={styles?.label}>Risk Classification</Text>
              <View style={{ marginBottom: 16, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
                <select
                  style={{ padding: 12, fontSize: 14, width: '100%', height: 44, borderColor: '#D1D5DB' }}
                  value={inviteForm.riskClassification}
                  onChange={(event) => setInviteForm({ ...inviteForm, riskClassification: event.target.value })}
                  disabled={creatingAndSendingInvitation}
                >
                  <option value="">Select risk level</option>
                  {RISK_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </View>

              <Text style={styles?.label}>Submit Form Deadline</Text>
              <TextInput
                style={styles?.input}
                placeholder="DD/MM/YYYY"
                value={inviteForm.deadline}
                onChangeText={(text) => setInviteForm({ ...inviteForm, deadline: text })}
                editable={!creatingAndSendingInvitation}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  style={[styles?.addButton, { flex: 1, backgroundColor: '#6B7280' }]}
                  onPress={() => setShowInviteModal(false)}
                  disabled={creatingAndSendingInvitation}
                >
                  <Text style={styles?.addButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles?.addButton, { flex: 1, backgroundColor: creatingAndSendingInvitation ? '#9CA3AF' : '#8B5CF6' }]}
                  onPress={handleCreateAndInvite}
                  disabled={creatingAndSendingInvitation}
                >
                  <Text style={styles?.addButtonText}>
                    {creatingAndSendingInvitation ? '⏳ Processing...' : '+ Create & Invite'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { listContractorsBySite } from '../../api/contractors';
import {
  formatInductionExpiry,
  getOtherSiteNames,
  getSiteInductionStatus,
  isExpiringWithinDays,
  INDUCTION_EXPIRING_SOON_DAYS,
} from '../../utils/siteInductionStatus';
import { exportContractorsCsv } from '../../utils/managerHubExport';

const EXPORT_OPTIONS = [
  { key: 'all_at_site', label: 'All contractors at site' },
  { key: 'inducted', label: 'Inducted contractors' },
  { key: 'expired', label: 'Expired contractors' },
  { key: 'expiring_soon', label: `Due in ${INDUCTION_EXPIRING_SOON_DAYS} days` },
];

export default function ManagerContractorsPanel({
  siteId,
  siteIdToName,
  siteName = '',
  mode = 'inducted',
  inductionTab = 'all',
  onInductionTabChange,
  onBack,
  styles,
}) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const loadContractors = useCallback(async () => {
    if (!siteId) {
      setContractors([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const rows = await listContractorsBySite(siteId);
      setContractors(rows);
    } catch (loadError) {
      console.error('Failed to load site contractors:', loadError);
      setError(loadError?.message || 'Failed to load contractors');
      setContractors([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadContractors();
  }, [loadContractors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contractors.filter((contractor) => {
      const status = getSiteInductionStatus(contractor, siteId);
      if (mode === 'inducted' && status !== 'inducted') {
        return false;
      }
      if (mode === 'expired' && status !== 'expired') {
        return false;
      }
      if (mode === 'inducted' && inductionTab === 'expiring_soon' && !isExpiringWithinDays(contractor, siteId)) {
        return false;
      }
      if (!query) {
        return true;
      }
      const company = (contractor.company_name || contractor.companyName || '').toLowerCase();
      return (
        contractor.name?.toLowerCase().includes(query)
        || contractor.email?.toLowerCase().includes(query)
        || company.includes(query)
      );
    });
  }, [contractors, inductionTab, mode, search, siteId]);

  const title = mode === 'expired' ? 'Expired Inductions' : 'Inducted Contractors';

  const emptyMessage = useMemo(() => {
    if (mode === 'expired') {
      return 'No expired inductions at this site.';
    }
    if (inductionTab === 'expiring_soon') {
      return `No inductions due in the next ${INDUCTION_EXPIRING_SOON_DAYS} days at this site.`;
    }
    return 'No inducted contractors at this site.';
  }, [inductionTab, mode]);

  const handleExport = (filter) => {
    setShowExportMenu(false);
    exportContractorsCsv({
      contractors,
      siteId,
      siteIdToName,
      siteName,
      filter,
    });
  };

  const setInductionTab = (tab) => {
    if (onInductionTabChange) {
      onInductionTabChange(tab);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          onPress={() => setShowExportMenu(true)}
          disabled={!siteId || loading}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 6,
            opacity: !siteId || loading ? 0.5 : 1,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>Export</Text>
        </TouchableOpacity>
      </View>

      {!siteId ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: '#6B7280' }}>Select a site to view contractors.</Text>
        </View>
      ) : (
        <>
          {mode === 'inducted' ? (
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
              <TouchableOpacity
                onPress={() => setInductionTab('all')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: inductionTab === 'all' ? '#2563EB' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: inductionTab === 'all' ? '#2563EB' : '#D1D5DB',
                }}
              >
                <Text style={{ color: inductionTab === 'all' ? '#FFFFFF' : '#374151', fontWeight: '700', fontSize: 13 }}>
                  All inducted
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setInductionTab('expiring_soon')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: inductionTab === 'expiring_soon' ? '#D97706' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: inductionTab === 'expiring_soon' ? '#D97706' : '#D1D5DB',
                }}
              >
                <Text
                  style={{
                    color: inductionTab === 'expiring_soon' ? '#FFFFFF' : '#374151',
                    fontWeight: '700',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  Due in {INDUCTION_EXPIRING_SOON_DAYS} days
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ padding: 16 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, email, or company"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: '#FFFFFF',
              }}
            />
          </View>

          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : error ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#B91C1C' }}>{error}</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#6B7280' }}>{emptyMessage}</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {filtered.map((contractor) => {
                const otherSites = getOtherSiteNames(contractor, siteId, siteIdToName);
                const status = getSiteInductionStatus(contractor, siteId);
                const expiringSoon = isExpiringWithinDays(contractor, siteId);
                const statusColor = status === 'inducted' ? (expiringSoon ? '#92400E' : '#065F46') : '#7F1D1D';
                const statusBg = status === 'inducted' ? (expiringSoon ? '#FEF3C7' : '#D1FAE5') : '#FEE2E2';
                const statusLabel = status === 'inducted'
                  ? (expiringSoon ? `Due in ${INDUCTION_EXPIRING_SOON_DAYS}d` : 'Inducted')
                  : 'Expired';

                return (
                  <View
                    key={contractor.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 }}>
                        {contractor.name}
                      </Text>
                      <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: statusColor, fontWeight: '600', fontSize: 12 }}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: '#4B5563', marginTop: 4 }}>
                      {contractor.company_name || contractor.companyName || 'No company'}
                    </Text>
                    <Text style={{ color: '#6B7280', marginTop: 4, fontSize: 13 }}>
                      Expiry: {formatInductionExpiry(contractor.induction_expiry || contractor.inductionExpiry)}
                    </Text>
                    {contractor.email ? (
                      <Text style={{ color: '#6B7280', marginTop: 2, fontSize: 13 }}>{contractor.email}</Text>
                    ) : null}
                    {otherSites.length > 0 ? (
                      <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 12 }}>
                        Also on: {otherSites.join(', ')}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </>
      )}

      <Modal visible={showExportMenu} transparent animationType="fade" onRequestClose={() => setShowExportMenu(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              Export contractors
            </Text>
            {EXPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => handleExport(option.key)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}
              >
                <Text style={{ color: '#111827', fontWeight: '600' }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowExportMenu(false)}
              style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}
            >
              <Text style={{ color: '#2563EB', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

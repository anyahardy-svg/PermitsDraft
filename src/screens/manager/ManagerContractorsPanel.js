import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { listContractorsBySite, removeContractorFromSite } from '../../api/contractors';
import {
  formatInductionExpiry,
  getAllSiteNames,
  getOtherSiteNames,
  getSiteInductionExpiry,
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
  onContractorRemoved,
  styles,
}) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedContractorIds, setSelectedContractorIds] = useState([]);
  const [removalConfirmContractors, setRemovalConfirmContractors] = useState([]);
  const [isRemovingFromSite, setIsRemovingFromSite] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

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

  useEffect(() => {
    setSelectedContractorIds([]);
    setRemovalConfirmContractors([]);
  }, [siteId, mode, inductionTab]);

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

  const toggleContractorSelected = (contractorId) => {
    setSelectedContractorIds((prev) => (
      prev.includes(contractorId)
        ? prev.filter((id) => id !== contractorId)
        : [...prev, contractorId]
    ));
  };

  const selectAllFilteredContractors = () => {
    setSelectedContractorIds(filtered.map((contractor) => contractor.id));
  };

  const clearSelectedContractors = () => {
    setSelectedContractorIds([]);
  };

  const selectedFilteredContractors = useMemo(
    () => filtered.filter((contractor) => selectedContractorIds.includes(contractor.id)),
    [filtered, selectedContractorIds],
  );

  const confirmRemoveSelectedFromSite = () => {
    if (selectedFilteredContractors.length === 0) {
      return;
    }
    setRemovalConfirmContractors(selectedFilteredContractors);
  };

  const handleConfirmRemoveFromSite = async () => {
    if (!siteId || removalConfirmContractors.length === 0) {
      return;
    }

    const targets = [...removalConfirmContractors];
    setRemovalConfirmContractors([]);
    setIsRemovingFromSite(true);

    const removedNames = [];
    const removedIds = [];
    const failedNames = [];

    try {
      for (const contractor of targets) {
        try {
          await removeContractorFromSite(contractor.id, siteId);
          removedIds.push(contractor.id);
          removedNames.push(contractor.name);
        } catch (removeError) {
          failedNames.push(contractor.name || 'Unknown');
          console.error('Failed to remove contractor from site:', contractor.id, removeError);
        }
      }

      const removedIdSet = new Set(removedIds);
      setSelectedContractorIds((prev) => prev.filter((id) => !removedIdSet.has(id)));

      if (removedNames.length > 0) {
        await loadContractors();
        if (onContractorRemoved) {
          onContractorRemoved();
        }
      }

      if (failedNames.length === 0) {
        const count = removedNames.length;
        setActionMessage({
          title: count === 1 ? 'Contractor removed' : `${count} contractors removed`,
          body: count === 1
            ? `${removedNames[0]} has been removed from ${siteName || 'this site'}.`
            : `${removedNames.length} people have been removed from ${siteName || 'this site'}.`,
        });
      } else if (removedNames.length === 0) {
        setActionMessage({
          title: 'Could not remove contractors',
          body: `None of the selected people could be removed. ${failedNames.join(', ')}`,
        });
      } else {
        setActionMessage({
          title: 'Some removals failed',
          body: `Removed from site: ${removedNames.join(', ')}. Failed: ${failedNames.join(', ')}.`,
        });
      }
    } finally {
      setIsRemovingFromSite(false);
    }
  };

  const listSummaryLabel = useMemo(() => {
    if (mode === 'expired') {
      return `${filtered.length} expired induction${filtered.length === 1 ? '' : 's'}`;
    }
    if (inductionTab === 'expiring_soon') {
      return `${filtered.length} due in ${INDUCTION_EXPIRING_SOON_DAYS} days`;
    }
    return `${filtered.length} inducted contractor${filtered.length === 1 ? '' : 's'}`;
  }, [filtered.length, inductionTab, mode]);

  const renderContractorsTable = () => {
    const allFilteredSelected = filtered.length > 0
      && filtered.every((contractor) => selectedContractorIds.includes(contractor.id));
    const tableBodyMaxHeight = Platform.OS === 'web'
      ? Math.min(Dimensions.get('window').height * 0.55, 640)
      : 480;

    return (
      <>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          marginBottom: 8,
          gap: 8,
          flexWrap: 'wrap',
        }}
        >
          <Text style={{ color: '#6B7280', fontSize: 13 }}>
            {listSummaryLabel}
            {selectedContractorIds.length > 0
              ? ` · ${selectedContractorIds.length} selected`
              : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={selectAllFilteredContractors} disabled={filtered.length === 0}>
              <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600' }}>Select all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearSelectedContractors} disabled={selectedContractorIds.length === 0}>
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmRemoveSelectedFromSite}
              disabled={selectedFilteredContractors.length === 0 || isRemovingFromSite}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: selectedFilteredContractors.length === 0 ? '#FECACA' : '#DC2626',
                opacity: isRemovingFromSite ? 0.6 : 1,
              }}
            >
              {isRemovingFromSite ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Remove from site
                  {selectedFilteredContractors.length > 0 ? ` (${selectedFilteredContractors.length})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 24, flex: 1 }}>
          <View style={{
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}
          >
            <ScrollView horizontal nestedScrollEnabled>
              <View>
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: '#3B82F6',
                  borderBottomWidth: 2,
                  borderBottomColor: '#2563EB',
                  ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 2 } : null),
                }}
                >
                  <TouchableOpacity
                    style={{
                      width: 52,
                      padding: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRightWidth: 1,
                      borderRightColor: '#2563EB',
                    }}
                    onPress={() => (allFilteredSelected ? clearSelectedContractors() : selectAllFilteredContractors())}
                    disabled={filtered.length === 0 || isRemovingFromSite}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                      {allFilteredSelected ? '☑' : '☐'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ width: 200, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Name</Text>
                  <Text style={{ width: 220, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Company</Text>
                  <Text style={{ width: 130, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Expiry Date</Text>
                  <Text style={{ width: 320, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14 }}>Sites</Text>
                </View>

                <ScrollView nestedScrollEnabled style={{ maxHeight: tableBodyMaxHeight }} showsVerticalScrollIndicator>
                  {filtered.map((contractor, index) => {
                    const isSelected = selectedContractorIds.includes(contractor.id);
                    const allSitesLabel = getAllSiteNames(contractor, siteIdToName).join(', ') || '—';

                    return (
                      <TouchableOpacity
                        key={contractor.id}
                        activeOpacity={0.85}
                        onPress={() => toggleContractorSelected(contractor.id)}
                        disabled={isRemovingFromSite}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isSelected ? '#EFF6FF' : (index % 2 === 0 ? '#FFFFFF' : '#F3F4F6'),
                          borderBottomWidth: 1,
                          borderBottomColor: '#E5E7EB',
                        }}
                      >
                        <View style={{
                          width: 52,
                          padding: 12,
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRightWidth: 1,
                          borderRightColor: '#E5E7EB',
                        }}
                        >
                          <Text style={{ fontSize: 16 }}>{isSelected ? '☑' : '☐'}</Text>
                        </View>
                        <Text style={{ width: 200, padding: 12, fontSize: 13, color: '#111827', fontWeight: '600', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                          {contractor.name}
                        </Text>
                        <Text style={{ width: 220, padding: 12, fontSize: 13, color: '#4B5563', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                          {contractor.company_name || contractor.companyName || 'No company'}
                        </Text>
                        <Text style={{ width: 130, padding: 12, fontSize: 13, color: '#6B7280', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                          {formatInductionExpiry(getSiteInductionExpiry(contractor, siteId))}
                        </Text>
                        <Text style={{ width: 320, padding: 12, fontSize: 13, color: '#374151' }}>
                          {allSitesLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      </>
    );
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
            renderContractorsTable()
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

      <Modal
        visible={removalConfirmContractors.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setRemovalConfirmContractors([])}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              {removalConfirmContractors.length === 1
                ? 'Remove contractor from site?'
                : `Remove ${removalConfirmContractors.length} contractors from site?`}
            </Text>
            <Text style={{ paddingHorizontal: 16, paddingVertical: 14, color: '#374151', lineHeight: 22 }}>
              {removalConfirmContractors.length === 1 ? (
                <>
                  {removalConfirmContractors[0]?.name} will no longer be linked to {siteName || 'this site'}.
                  {(() => {
                    const otherSites = getOtherSiteNames(removalConfirmContractors[0], siteId, siteIdToName);
                    return otherSites.length > 0
                      ? ` They will remain linked to: ${otherSites.join(', ')}.`
                      : '';
                  })()}
                </>
              ) : (
                <>
                  These people will be unlinked from {siteName || 'this site'} only. Their contractor records and other site links are not deleted.
                </>
              )}
            </Text>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <TouchableOpacity
                onPress={() => setRemovalConfirmContractors([])}
                style={{ flex: 1, padding: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmRemoveFromSite}
                style={{ flex: 1, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Remove from site</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!actionMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMessage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              {actionMessage?.title}
            </Text>
            <Text style={{ paddingHorizontal: 16, paddingVertical: 14, color: '#374151', lineHeight: 22 }}>
              {actionMessage?.body}
            </Text>
            <TouchableOpacity
              onPress={() => setActionMessage(null)}
              style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}
            >
              <Text style={{ color: '#2563EB', fontWeight: '700' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

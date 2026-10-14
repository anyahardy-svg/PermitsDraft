import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import {
  addSiteToCompany,
  listCompaniesAtSite,
  removeSiteFromCompany,
  searchCompaniesNotAtSite,
} from '../../api/managerHub';
import {
  getAccreditationStatusDisplay,
  resolveAccreditationDisplayStatus,
} from '../../utils/accreditation';
import { exportCompaniesCsv } from '../../utils/managerHubExport';
import { getCompanyTrainingRecordsStatus } from '../../api/trainingRecords';
import { getCompanyTrainingMatricesStatus } from '../../api/companyTrainingMatrices';
import CompanyAccreditationScreen from '../CompanyAccreditationScreen';
import TrainingRecordsScreen from '../TrainingRecordsScreen';
import CompanyContractorAttachmentsModal from '../../components/CompanyContractorAttachmentsModal';

function renderAccreditationBadge(company) {
  // Use status from listCompaniesAtSite transform; re-resolving here fails when
  // accreditation_last_updated / invitation fields were not kept on the row.
  const status = company.accreditationStatus || resolveAccreditationDisplayStatus(company);
  const display = getAccreditationStatusDisplay(status);
  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: display.backgroundColor,
    }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: display.color }}>
        {display.label}
      </Text>
    </View>
  );
}

function renderTrainingRecordsBadge(company) {
  const total = company.training_records_total ?? 0;
  const approved = company.training_records_approved ?? 0;
  const allApproved = total > 0 && approved === total;
  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: allApproved ? '#D1FAE5' : total > 0 ? '#FEF3C7' : '#F3F4F6',
    }}
    >
      <Text style={{
        fontSize: 13,
        fontWeight: '600',
        color: allApproved ? '#065F46' : total > 0 ? '#92400E' : '#6B7280',
      }}
      >
        {allApproved ? '✓ Approved' : total > 0 ? `⏳ ${total - approved} Pending` : '○ None'}
      </Text>
    </View>
  );
}

function renderTrainingMatricesBadge(company) {
  const total = company.training_matrices_total ?? 0;
  const approved = company.training_matrices_approved ?? 0;
  const allApproved = total > 0 && approved === total;
  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: allApproved ? '#D1FAE5' : total > 0 ? '#FEF3C7' : '#F3F4F6',
    }}
    >
      <Text style={{
        fontSize: 13,
        fontWeight: '600',
        color: allApproved ? '#065F46' : total > 0 ? '#92400E' : '#6B7280',
      }}
      >
        {allApproved ? '✓ Approved' : total > 0 ? `⏳ ${total - approved} Pending` : '○ None'}
      </Text>
    </View>
  );
}

export default function ManagerCompaniesPanel({
  siteId,
  siteName = '',
  mode = 'at_site',
  onBack,
  styles,
  onCompanyAdded,
}) {
  const [companiesAtSite, setCompaniesAtSite] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [companySearchText, setCompanySearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showAccreditationModal, setShowAccreditationModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [companyPendingRemoval, setCompanyPendingRemoval] = useState(null);

  const title = mode === 'add' ? 'Add Company to Site' : 'Companies at Site';

  const handleExport = () => {
    exportCompaniesCsv({
      companies: companiesAtSite,
      siteName: siteName || 'site',
    });
  };

  const refreshCompanyTrainingCounters = useCallback(async (companyId) => {
    if (!companyId) {
      return;
    }
    try {
      const [recordsResult, matricesResult] = await Promise.all([
        getCompanyTrainingRecordsStatus(companyId),
        getCompanyTrainingMatricesStatus(companyId),
      ]);
      setCompaniesAtSite((prev) => prev.map((row) => {
        if (row.id !== companyId) {
          return row;
        }
        const next = { ...row };
        if (recordsResult?.success) {
          next.training_records_total = recordsResult.total ?? row.training_records_total;
          next.training_records_approved = recordsResult.approved ?? row.training_records_approved;
        }
        if (matricesResult?.success) {
          next.training_matrices_total = matricesResult.total ?? row.training_matrices_total;
          next.training_matrices_approved = matricesResult.approved ?? row.training_matrices_approved;
        }
        return next;
      }));
    } catch (refreshError) {
      console.warn('Failed to refresh training counters:', refreshError);
    }
  }, []);

  const loadAtSite = useCallback(async () => {
    if (!siteId) {
      setCompaniesAtSite([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const rows = await listCompaniesAtSite(siteId);
      setCompaniesAtSite(rows);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load companies');
      setCompaniesAtSite([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (mode === 'at_site') {
      loadAtSite();
    }
  }, [loadAtSite, mode]);

  const filteredAtSite = useMemo(() => {
    const query = companySearchText.trim().toLowerCase();
    if (!query) {
      return companiesAtSite;
    }
    return companiesAtSite.filter((company) => company.name?.toLowerCase().includes(query));
  }, [companiesAtSite, companySearchText]);

  const runSearch = useCallback(async () => {
    if (!siteId) {
      return;
    }

    setSearchLoading(true);
    setError('');
    try {
      const rows = await searchCompaniesNotAtSite(siteId, searchQuery);
      setSearchResults(rows);
    } catch (searchError) {
      setSearchResults([]);
      setError(searchError?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, siteId]);

  useEffect(() => {
    if (mode === 'add' && siteId) {
      runSearch();
    }
  }, [mode, siteId, runSearch]);

  const handleAddSite = async (company) => {
    if (!siteId || !company?.id) {
      return;
    }

    setAddingId(company.id);
    try {
      await addSiteToCompany(company.id, siteId);
      Alert.alert('Site added', `${company.name} is now linked to ${siteName || 'this site'}.`);
      if (onCompanyAdded) {
        onCompanyAdded();
      }
      await runSearch();
    } catch (addError) {
      Alert.alert('Could not add site', addError?.message || 'Please try again.');
    } finally {
      setAddingId(null);
    }
  };

  const openAccreditation = (company) => {
    setSelectedCompany(company);
    setShowAccreditationModal(true);
  };

  const openTraining = (company) => {
    setSelectedCompany(company);
    setShowTrainingModal(true);
  };

  const openAttachments = (company) => {
    setSelectedCompany(company);
    setShowAttachmentsModal(true);
  };

  const handleConfirmRemoveFromSite = async () => {
    const company = companyPendingRemoval;
    if (!company?.id || !siteId) {
      return;
    }
    setCompanyPendingRemoval(null);
    setRemovingId(company.id);
    try {
      await removeSiteFromCompany(company.id, siteId);
      Alert.alert(
        'Company removed from site',
        `${company.name} is no longer linked to ${siteName || 'this site'}. The company record was not deleted.`,
      );
      await loadAtSite();
      if (onCompanyAdded) {
        onCompanyAdded();
      }
    } catch (removeError) {
      Alert.alert('Could not remove company', removeError?.message || 'Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const renderCompaniesTable = () => {
    const tableBodyMaxHeight = Platform.OS === 'web'
      ? Math.min(Dimensions.get('window').height * 0.55, 640)
      : 480;

    return (
      <>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <TextInput
            value={companySearchText}
            onChangeText={setCompanySearchText}
            placeholder="Search by company name..."
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: '#FFFFFF',
            }}
          />
          <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 8 }}>
            {filteredAtSite.length} compan{filteredAtSite.length === 1 ? 'y' : 'ies'} at this site
          </Text>
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
                  <Text style={{ width: 240, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Company Name</Text>
                  <Text style={{ width: 130, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Accreditation</Text>
                  <Text style={{ width: 150, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Training Records</Text>
                  <Text style={{ width: 150, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Training Matrices</Text>
                  <Text style={{ width: 120, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Attachments</Text>
                  <Text style={{ width: 100, padding: 12, fontWeight: 'bold', color: '#FFFFFF', fontSize: 14, textAlign: 'center' }}>Actions</Text>
                </View>

                <ScrollView nestedScrollEnabled style={{ maxHeight: tableBodyMaxHeight }} showsVerticalScrollIndicator>
                  {filteredAtSite.length === 0 ? (
                    <View style={{ padding: 20, width: 890 }}>
                      <Text style={{ color: '#6B7280', textAlign: 'center' }}>No companies match your search.</Text>
                    </View>
                  ) : null}
                  {filteredAtSite.map((company, index) => {
                    const isRemoving = removingId === company.id;
                    return (
                      <View
                        key={company.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F3F4F6',
                          borderBottomWidth: 1,
                          borderBottomColor: '#E5E7EB',
                        }}
                      >
                        <Text style={{ width: 240, padding: 12, fontSize: 13, color: '#111827', fontWeight: '600', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                          {company.name}
                        </Text>
                        <TouchableOpacity
                          style={{ width: 130, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}
                          onPress={() => openAccreditation(company)}
                        >
                          {renderAccreditationBadge(company)}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ width: 150, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}
                          onPress={() => openTraining(company)}
                        >
                          {renderTrainingRecordsBadge(company)}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ width: 150, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}
                          onPress={() => openTraining(company)}
                        >
                          {renderTrainingMatricesBadge(company)}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ width: 120, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}
                          onPress={() => openAttachments(company)}
                        >
                          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#EEF2FF' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#4338CA' }}>📎 View</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={{ width: 100, padding: 8, justifyContent: 'center', alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={() => setCompanyPendingRemoval(company)}
                            disabled={isRemoving}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 6,
                              backgroundColor: '#EF4444',
                              borderRadius: 4,
                              opacity: isRemoving ? 0.6 : 1,
                            }}
                          >
                            {isRemoving ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Del</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
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
        {mode === 'at_site' ? (
          <TouchableOpacity
            onPress={handleExport}
            disabled={!siteId || loading || companiesAtSite.length === 0}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 6,
              opacity: !siteId || loading || companiesAtSite.length === 0 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>Export</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {!siteId ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: '#6B7280' }}>Select a site to manage companies.</Text>
        </View>
      ) : mode === 'at_site' ? (
        loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : error ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#B91C1C' }}>{error}</Text>
          </View>
        ) : companiesAtSite.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#6B7280' }}>
              No companies linked to this site yet. Use “Add Company to Site” from the hub.
            </Text>
          </View>
        ) : (
          renderCompaniesTable()
        )
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 8 }}>
            {siteName ? (
              <Text style={{ color: '#374151', fontWeight: '600' }}>
                Adding to site: {siteName}
              </Text>
            ) : null}
            <Text style={{ color: '#6B7280', fontSize: 13 }}>
              Shows all companies not yet linked to this site in companies.site_ids.
            </Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search companies"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: '#FFFFFF',
              }}
            />
            <TouchableOpacity
              onPress={runSearch}
              style={{
                backgroundColor: '#2563EB',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Search</Text>
            </TouchableOpacity>
          </View>

          {searchLoading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : error ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: '#B91C1C' }}>{error}</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: '#6B7280' }}>No companies found to add.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {searchResults.map((company) => (
                <View
                  key={company.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{company.name}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>
                      Accreditation: {company.accreditationStatusLabel || getAccreditationStatusDisplay(company.accreditationStatus).label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAddSite(company)}
                    disabled={addingId === company.id}
                    style={{
                      backgroundColor: addingId === company.id ? '#9CA3AF' : '#059669',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                      {addingId === company.id ? 'Adding…' : '+ Add site'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <Modal
        visible={showAccreditationModal && !!selectedCompany}
        animationType="slide"
        onRequestClose={() => {
          setShowAccreditationModal(false);
          setSelectedCompany(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{
            backgroundColor: '#3B82F6',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#2563EB',
          }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                {selectedCompany?.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#DBEAFE', marginTop: 4 }}>
                Accreditation
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowAccreditationModal(false);
                setSelectedCompany(null);
                loadAtSite();
              }}
              style={{ padding: 8 }}
            >
              <Text style={{ fontSize: 24, color: '#FFFFFF', fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedCompany ? (
            <CompanyAccreditationScreen
              key={selectedCompany.id}
              companyId={selectedCompany.id}
              reviewMode={!['pending_manager', 'pending_hs'].includes(selectedCompany.accreditationStatus)}
              approverReviewMode={['pending_manager', 'pending_hs'].includes(selectedCompany.accreditationStatus)}
              styles={styles}
              onClose={() => {
                setShowAccreditationModal(false);
                setSelectedCompany(null);
                loadAtSite();
              }}
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={showTrainingModal && !!selectedCompany}
        animationType="slide"
        onRequestClose={() => setShowTrainingModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{
            backgroundColor: '#8B5CF6',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#7C3AED',
          }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                {selectedCompany?.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#E9D5FF', marginTop: 4 }}>
                Training records & matrices
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowTrainingModal(false);
                if (selectedCompany?.id) {
                  refreshCompanyTrainingCounters(selectedCompany.id);
                }
                setSelectedCompany(null);
              }}
              style={{ padding: 8 }}
            >
              <Text style={{ fontSize: 24, color: '#FFFFFF', fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedCompany ? (
            <TrainingRecordsScreen
              loggedInCompanyId={selectedCompany.id}
              styles={styles}
              onClose={() => {
                setShowTrainingModal(false);
                refreshCompanyTrainingCounters(selectedCompany.id);
                setSelectedCompany(null);
              }}
              onStatusChanged={() => refreshCompanyTrainingCounters(selectedCompany.id)}
              onMatrixStatusChanged={() => refreshCompanyTrainingCounters(selectedCompany.id)}
            />
          ) : null}
        </View>
      </Modal>

      <CompanyContractorAttachmentsModal
        visible={showAttachmentsModal && !!selectedCompany}
        company={selectedCompany}
        onClose={() => {
          setShowAttachmentsModal(false);
          setSelectedCompany(null);
        }}
      />

      <Modal
        visible={!!companyPendingRemoval}
        transparent
        animationType="fade"
        onRequestClose={() => setCompanyPendingRemoval(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              Remove company from site?
            </Text>
            <Text style={{ paddingHorizontal: 16, paddingVertical: 14, color: '#374151', lineHeight: 22 }}>
              {companyPendingRemoval?.name} will be unlinked from {siteName || 'this site'}. The company record and links to other sites are not deleted.
            </Text>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <TouchableOpacity
                onPress={() => setCompanyPendingRemoval(null)}
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
    </View>
  );
}

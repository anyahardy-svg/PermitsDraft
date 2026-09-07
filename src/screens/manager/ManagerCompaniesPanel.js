import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  addSiteToCompany,
  listCompaniesAtSite,
  searchCompaniesNotAtSite,
} from '../../api/managerHub';
import { getAccreditationStatusDisplay } from '../../utils/accreditation';
import { exportCompaniesCsv } from '../../utils/managerHubExport';

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('en-NZ');
}

function isInsuranceExpired(value) {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

export default function ManagerCompaniesPanel({ siteId, siteName = '', mode = 'at_site', onBack, styles, onCompanyAdded }) {
  const [companiesAtSite, setCompaniesAtSite] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState('');

  const title = mode === 'add' ? 'Add Company to Site' : 'Companies at Site';

  const handleExport = () => {
    exportCompaniesCsv({
      companies: companiesAtSite,
      siteName: siteName || 'site',
    });
  };

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
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            {companiesAtSite.map((company) => (
              <View
                key={company.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{company.name}</Text>
                <Text style={{ color: '#6B7280', marginTop: 4, fontSize: 13 }}>
                  Accreditation: {company.accreditationStatusLabel || getAccreditationStatusDisplay(company.accreditationStatus).label}
                </Text>
                <Text style={{ color: '#6B7280', marginTop: 2, fontSize: 13 }}>
                  Accredited date: {formatDate(company.accreditedDate)}
                </Text>
                <Text
                  style={{
                    color: isInsuranceExpired(company.publicLiabilityExpiry) ? '#B91C1C' : '#6B7280',
                    marginTop: 4,
                    fontSize: 13,
                  }}
                >
                  PL insurance expiry: {formatDate(company.publicLiabilityExpiry)}
                </Text>
                <Text
                  style={{
                    color: isInsuranceExpired(company.motorVehicleInsuranceExpiry) ? '#B91C1C' : '#6B7280',
                    marginTop: 2,
                    fontSize: 13,
                  }}
                >
                  Vehicle insurance expiry: {formatDate(company.motorVehicleInsuranceExpiry)}
                </Text>
              </View>
            ))}
          </ScrollView>
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
    </View>
  );
}

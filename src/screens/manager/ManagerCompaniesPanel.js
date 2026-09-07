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
  addSiteToAccreditedCompany,
  listAccreditedCompaniesAtSite,
  searchAccreditedCompaniesNotAtSite,
} from '../../api/managerHub';

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

export default function ManagerCompaniesPanel({ siteId }) {
  const [subTab, setSubTab] = useState('at_site');
  const [companiesAtSite, setCompaniesAtSite] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState('');

  const loadAtSite = useCallback(async () => {
    if (!siteId) {
      setCompaniesAtSite([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const rows = await listAccreditedCompaniesAtSite(siteId);
      setCompaniesAtSite(rows);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load companies');
      setCompaniesAtSite([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadAtSite();
  }, [loadAtSite]);

  const runSearch = useCallback(async () => {
    if (!siteId) {
      return;
    }

    setSearchLoading(true);
    setError('');
    try {
      const rows = await searchAccreditedCompaniesNotAtSite(siteId, searchQuery);
      setSearchResults(rows);
    } catch (searchError) {
      setSearchResults([]);
      setError(searchError?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, siteId]);

  useEffect(() => {
    if (subTab === 'add' && siteId) {
      runSearch();
    }
  }, [subTab, siteId, runSearch]);

  const handleAddSite = async (company) => {
    if (!siteId || !company?.id) {
      return;
    }

    setAddingId(company.id);
    try {
      await addSiteToAccreditedCompany(company.id, siteId);
      Alert.alert('Site added', `${company.name} is now linked to this site.`);
      await loadAtSite();
      await runSearch();
    } catch (addError) {
      Alert.alert('Could not add site', addError?.message || 'Please try again.');
    } finally {
      setAddingId(null);
    }
  };

  if (!siteId) {
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ color: '#6B7280' }}>Select a site to manage accredited companies.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity
          onPress={() => setSubTab('at_site')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: subTab === 'at_site' ? '#2563EB' : '#E5E7EB',
          }}
        >
          <Text style={{ color: subTab === 'at_site' ? '#FFFFFF' : '#374151', fontWeight: '600' }}>
            At this site ({companiesAtSite.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSubTab('add')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: subTab === 'add' ? '#2563EB' : '#E5E7EB',
          }}
        >
          <Text style={{ color: subTab === 'add' ? '#FFFFFF' : '#374151', fontWeight: '600' }}>
            Add company
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'at_site' ? (
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
              No accredited companies linked to this site yet. Use “Add company” to link one.
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
                  Accredited: {formatDate(company.accreditedDate)}
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
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search accredited companies"
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
          ) : searchResults.length === 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: '#6B7280' }}>No accredited companies found to add.</Text>
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
                      Accredited: {formatDate(company.accreditedDate)}
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

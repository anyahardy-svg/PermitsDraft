import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { listContractorsBySite } from '../../api/contractors';
import {
  formatInductionExpiry,
  getOtherSiteNames,
  getSiteInductionStatus,
} from '../../utils/siteInductionStatus';

export default function ManagerContractorsPanel({
  siteId,
  siteIdToName,
  mode = 'inducted',
  onBack,
  styles,
}) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

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
  }, [contractors, mode, search, siteId]);

  const title = mode === 'expired' ? 'Expired Inductions' : 'Inducted Contractors';

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {!siteId ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: '#6B7280' }}>Select a site to view contractors.</Text>
        </View>
      ) : (
        <>
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
              <Text style={{ color: '#6B7280' }}>
                {mode === 'inducted' ? 'No inducted contractors at this site.' : 'No expired inductions at this site.'}
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {filtered.map((contractor) => {
                const otherSites = getOtherSiteNames(contractor, siteId, siteIdToName);
                const status = getSiteInductionStatus(contractor, siteId);
                const statusColor = status === 'inducted' ? '#065F46' : '#7F1D1D';
                const statusBg = status === 'inducted' ? '#D1FAE5' : '#FEE2E2';

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
                          {status === 'inducted' ? 'Inducted' : 'Expired'}
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
    </View>
  );
}

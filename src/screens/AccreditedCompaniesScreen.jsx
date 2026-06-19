import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { listAccreditedCompaniesReport } from '../api/accreditedCompaniesReport';

const COLUMNS = [
  { key: 'companyName', label: 'Company', width: 200 },
  { key: 'accreditationDateDisplay', label: 'Accreditation Date', width: 150 },
  { key: 'businessUnits', label: 'Business Unit', width: 180 },
  { key: 'sites', label: 'Site', width: 180 },
  { key: 'plInsuranceExpiryDisplay', label: 'PL Insurance Expiry', width: 160 },
  { key: 'vehicleInsuranceExpiryDisplay', label: 'Vehicle Insurance Expiry', width: 180 },
  { key: 'inRadarDisplay', label: 'In RADAR', width: 100 },
];

function isExpired(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function isExpiringSoon(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
}

function getExpiryStyle(dateValue) {
  if (isExpired(dateValue)) {
    return { color: '#7F1D1D', fontWeight: '600' };
  }

  if (isExpiringSoon(dateValue)) {
    return { color: '#92400E', fontWeight: '600' };
  }

  return { color: '#4B5563', fontWeight: '400' };
}

function getExpiryPrefix(dateValue) {
  if (isExpired(dateValue)) {
    return '⚠ ';
  }

  if (isExpiringSoon(dateValue)) {
    return '⏳ ';
  }

  return '';
}

export default function AccreditedCompaniesScreen() {
  const [companies, setCompanies] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('All');
  const [siteFilter, setSiteFilter] = useState('All');

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAccreditedCompaniesReport();
      setCompanies(data.companies || []);
      setBusinessUnits(data.businessUnits || []);
      setSites(data.sites || []);
    } catch (loadError) {
      console.error('Failed to load accredited companies:', loadError);
      setError(loadError?.message || 'Failed to load accredited companies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const hasActiveFilters = searchText || businessUnitFilter !== 'All' || siteFilter !== 'All';

  const filteredCompanies = companies.filter((company) => {
    const query = searchText.toLowerCase();
    const matchesSearch = !searchText || (
      company.companyName?.toLowerCase().includes(query)
      || company.businessUnits?.toLowerCase().includes(query)
      || company.sites?.toLowerCase().includes(query)
    );

    const matchesBusinessUnit = businessUnitFilter === 'All'
      || (company.businessUnitIds || []).includes(businessUnitFilter);

    const matchesSite = siteFilter === 'All'
      || (company.siteIds || []).includes(siteFilter);

    return matchesSearch && matchesBusinessUnit && matchesSite;
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ marginBottom: 16, gap: 12 }}>
        <TextInput
          placeholder="Search by company, business unit, or site..."
          value={searchText}
          onChangeText={setSearchText}
          style={{
            borderWidth: 1,
            borderColor: '#D1D5DB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            backgroundColor: 'white',
          }}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <select
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderColor: '#D1D5DB',
              borderWidth: 1,
              borderRadius: 8,
              backgroundColor: 'white',
              fontSize: 14,
            }}
            value={businessUnitFilter}
            onChange={(e) => setBusinessUnitFilter(e.target.value)}
          >
            <option value="All">All Business Units</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>{bu.name}</option>
            ))}
          </select>
          <select
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderColor: '#D1D5DB',
              borderWidth: 1,
              borderRadius: 8,
              backgroundColor: 'white',
              fontSize: 14,
            }}
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
          >
            <option value="All">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </View>
      </View>

      {!loading && !error && (
        <Text style={{ color: '#6B7280', marginBottom: 12 }}>
          Showing {filteredCompanies.length} of {companies.length} accredited companies
        </Text>
      )}

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading accredited companies...</Text>
        </View>
      ) : error ? (
        <View style={{ padding: 20, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
          <Text style={{ color: '#7F1D1D' }}>{error}</Text>
        </View>
      ) : filteredCompanies.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: '#6B7280', fontSize: 15 }}>
            {hasActiveFilters ? 'No accredited companies match your filters.' : 'No accredited companies found.'}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: '#3B82F6' }}>
              {COLUMNS.map((column) => (
                <Text
                  key={column.key}
                  style={{
                    width: column.width,
                    padding: 12,
                    fontSize: 13,
                    fontWeight: '700',
                    color: 'white',
                    borderRightWidth: 1,
                    borderRightColor: '#2563EB',
                  }}
                >
                  {column.label}
                </Text>
              ))}
            </View>

            {filteredCompanies.map((company, index) => (
              <View
                key={company.id}
                style={{
                  flexDirection: 'row',
                  backgroundColor: index % 2 === 0 ? 'white' : '#F3F4F6',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                  alignItems: 'center',
                }}
              >
                <Text style={{ width: 200, padding: 12, fontSize: 13, color: '#1F2937', borderRightWidth: 1, borderRightColor: '#E5E7EB', fontWeight: '500' }}>
                  {company.companyName}
                </Text>
                <Text style={{ width: 150, padding: 12, fontSize: 13, color: '#4B5563', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                  {company.accreditationDateDisplay || '—'}
                </Text>
                <Text style={{ width: 180, padding: 12, fontSize: 13, color: '#4B5563', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                  {company.businessUnits || '—'}
                </Text>
                <Text style={{ width: 180, padding: 12, fontSize: 13, color: '#4B5563', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                  {company.sites || '—'}
                </Text>
                <Text style={{
                  width: 160,
                  padding: 12,
                  fontSize: 13,
                  borderRightWidth: 1,
                  borderRightColor: '#E5E7EB',
                  ...getExpiryStyle(company.plInsuranceExpiry),
                }}
                >
                  {company.plInsuranceExpiryDisplay
                    ? `${getExpiryPrefix(company.plInsuranceExpiry)}${company.plInsuranceExpiryDisplay}`
                    : '—'}
                </Text>
                <Text style={{
                  width: 180,
                  padding: 12,
                  fontSize: 13,
                  borderRightWidth: 1,
                  borderRightColor: '#E5E7EB',
                  ...getExpiryStyle(company.vehicleInsuranceExpiry),
                }}
                >
                  {company.vehicleInsuranceExpiryDisplay
                    ? `${getExpiryPrefix(company.vehicleInsuranceExpiry)}${company.vehicleInsuranceExpiryDisplay}`
                    : '—'}
                </Text>
                <Text style={{
                  width: 100,
                  padding: 12,
                  fontSize: 13,
                  color: company.inRadar ? '#92400E' : '#4B5563',
                  fontWeight: company.inRadar ? '600' : '400',
                }}
                >
                  {company.inRadarDisplay || '—'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { getAllSuppliers } from '../api/supplierApi';

const RISK_COLORS = {
  Critical: { backgroundColor: '#FCA5A5', color: '#7F1D1D' },
  High: { backgroundColor: '#FED7AA', color: '#92400E' },
  Medium: { backgroundColor: '#C7D2FE', color: '#3730A3' },
  Low: { backgroundColor: '#DBEAFE', color: '#0C4A6E' },
};

const STATUS_COLORS = {
  active: { backgroundColor: '#D1FAE5', color: '#065F46' },
  inactive: { backgroundColor: '#F3F4F6', color: '#6B7280' },
};

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

export default function SupplierListScreen({ onOpenForm, styles }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllSuppliers();

        if (!cancelled) {
          setSuppliers(data);
        }
      } catch (loadError) {
        console.error('Failed to load suppliers:', loadError);
        if (!cancelled) {
          const message = loadError?.message || 'Failed to load suppliers. Please try again.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchText) {
      return true;
    }

    return supplier.company_name?.toLowerCase().includes(searchText.toLowerCase());
  });

  const handleOpenForm = (supplierId) => {
    if (onOpenForm) {
      onOpenForm(supplierId);
    }
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
      <View style={{ marginBottom: 12 }}>
        <Text style={[styles?.label, { marginLeft: 0, fontSize: 16, fontWeight: 'bold' }]}>Suppliers Directory</Text>
      </View>

      <TextInput
        style={[styles?.input, { paddingHorizontal: 12, paddingVertical: 8, borderColor: '#D1D5DB', marginBottom: 12 }]}
        placeholder="Search suppliers..."
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
              <Text style={{ width: 280, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, borderRightWidth: 1, borderRightColor: '#2563EB' }}>Company Name</Text>
              <Text style={{ width: 140, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Risk</Text>
              <Text style={{ width: 120, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Status</Text>
              <Text style={{ width: 140, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#2563EB' }}>Created</Text>
              <Text style={{ width: 140, padding: 12, fontWeight: 'bold', color: 'white', fontSize: 14, textAlign: 'center' }}>Actions</Text>
            </View>

            {filteredSuppliers.map((supplier, index) => {
              const riskStyle = RISK_COLORS[supplier.risk_classification] || { backgroundColor: '#F3F4F6', color: '#6B7280' };
              const statusStyle = STATUS_COLORS[supplier.status] || STATUS_COLORS.inactive;

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
                  <Text style={{ width: 280, padding: 12, fontSize: 13, color: '#1F2937', borderRightWidth: 1, borderRightColor: '#E5E7EB', fontWeight: '500' }}>
                    {supplier.company_name}
                  </Text>
                  <View style={{ width: 140, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: riskStyle.backgroundColor }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: riskStyle.color }}>
                        {supplier.risk_classification || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 120, padding: 12, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: statusStyle.backgroundColor }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: statusStyle.color, textTransform: 'capitalize' }}>
                        {supplier.status || '—'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ width: 140, padding: 12, fontSize: 13, color: '#4B5563', textAlign: 'center', borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                    {formatDate(supplier.created_at)}
                  </Text>
                  <View style={{ width: 140, padding: 12, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                      onPress={() => handleOpenForm(supplier.id)}
                    >
                      <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>Open Form</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

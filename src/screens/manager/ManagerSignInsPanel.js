import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { searchSignInHistory } from '../../api/signIns';

const SEARCH_MODES = [
  { id: 'week', label: 'Week' },
  { id: 'date', label: 'Date' },
  { id: 'range', label: 'Date range' },
  { id: 'person', label: 'Person' },
  { id: 'company', label: 'Company' },
];

function parseDateInput(value) {
  if (!value) {
    return null;
  }
  const parts = value.split(/[/-]/).map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [day, month, year] = parts;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('en-NZ');
}

function formatDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) {
    return '—';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function getDefaultWeekStart() {
  const today = startOfDay(new Date());
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(today, diff);
}

function toInputDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function ManagerSignInsPanel({ siteId }) {
  const [mode, setMode] = useState('week');
  const [weekStartInput, setWeekStartInput] = useState(toInputDate(getDefaultWeekStart()));
  const [singleDateInput, setSingleDateInput] = useState(toInputDate(new Date()));
  const [rangeStartInput, setRangeStartInput] = useState('');
  const [rangeEndInput, setRangeEndInput] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');
  const [optionalStartInput, setOptionalStartInput] = useState('');
  const [optionalEndInput, setOptionalEndInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const buildFilters = useCallback(() => {
    const filters = {};

    if (mode === 'week') {
      const weekStart = parseDateInput(weekStartInput);
      if (!weekStart) {
        throw new Error('Enter a valid week start date (DD/MM/YYYY)');
      }
      filters.startDate = startOfDay(weekStart).toISOString();
      filters.endDate = addDays(startOfDay(weekStart), 7).toISOString();
    } else if (mode === 'date') {
      const day = parseDateInput(singleDateInput);
      if (!day) {
        throw new Error('Enter a valid date (DD/MM/YYYY)');
      }
      filters.startDate = startOfDay(day).toISOString();
      filters.endDate = addDays(startOfDay(day), 1).toISOString();
    } else if (mode === 'range') {
      const start = parseDateInput(rangeStartInput);
      const end = parseDateInput(rangeEndInput);
      if (!start || !end) {
        throw new Error('Enter valid start and end dates (DD/MM/YYYY)');
      }
      filters.startDate = startOfDay(start).toISOString();
      filters.endDate = addDays(startOfDay(end), 1).toISOString();
    } else if (mode === 'person') {
      const q = personQuery.trim();
      if (!q) {
        throw new Error('Enter a person name to search');
      }
      filters.personQuery = q;
      const optStart = parseDateInput(optionalStartInput);
      const optEnd = parseDateInput(optionalEndInput);
      if (optStart) {
        filters.startDate = startOfDay(optStart).toISOString();
      }
      if (optEnd) {
        filters.endDate = addDays(startOfDay(optEnd), 1).toISOString();
      }
    } else if (mode === 'company') {
      const q = companyQuery.trim();
      if (!q) {
        throw new Error('Enter a company name to search');
      }
      filters.companyQuery = q;
      const optStart = parseDateInput(optionalStartInput);
      const optEnd = parseDateInput(optionalEndInput);
      if (optStart) {
        filters.startDate = startOfDay(optStart).toISOString();
      }
      if (optEnd) {
        filters.endDate = addDays(startOfDay(optEnd), 1).toISOString();
      }
    }

    return filters;
  }, [
    mode,
    weekStartInput,
    singleDateInput,
    rangeStartInput,
    rangeEndInput,
    personQuery,
    companyQuery,
    optionalStartInput,
    optionalEndInput,
  ]);

  const runSearch = useCallback(async () => {
    if (!siteId) {
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const filters = buildFilters();
      const response = await searchSignInHistory(siteId, filters);
      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }
      setResults(response.data || []);
    } catch (searchError) {
      setResults([]);
      setError(searchError?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [buildFilters, siteId]);

  useEffect(() => {
    if (siteId) {
      runSearch();
    } else {
      setResults([]);
    }
  }, [siteId]);

  const modeHint = useMemo(() => {
    if (mode === 'week') {
      return 'Week of (Monday): DD/MM/YYYY';
    }
    if (mode === 'date') {
      return 'Single day: DD/MM/YYYY';
    }
    if (mode === 'range') {
      return 'From and to: DD/MM/YYYY';
    }
    if (mode === 'person') {
      return 'Matches visitor or contractor name. Optional date range below.';
    }
    return 'Matches visitor or contractor company. Optional date range below.';
  }, [mode]);

  if (!siteId) {
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ color: '#6B7280' }}>Select a site to search sign-in history.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          {SEARCH_MODES.map((item) => {
            const active = mode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setMode(item.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: active ? '#2563EB' : '#E5E7EB',
                }}
              >
                <Text style={{ color: active ? '#FFFFFF' : '#374151', fontWeight: '600' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: '#6B7280', fontSize: 13 }}>{modeHint}</Text>

        {mode === 'week' && (
          <TextInput
            value={weekStartInput}
            onChangeText={setWeekStartInput}
            placeholder="DD/MM/YYYY"
            style={inputStyle}
          />
        )}

        {mode === 'date' && (
          <TextInput
            value={singleDateInput}
            onChangeText={setSingleDateInput}
            placeholder="DD/MM/YYYY"
            style={inputStyle}
          />
        )}

        {mode === 'range' && (
          <View style={{ gap: 8 }}>
            <TextInput value={rangeStartInput} onChangeText={setRangeStartInput} placeholder="From DD/MM/YYYY" style={inputStyle} />
            <TextInput value={rangeEndInput} onChangeText={setRangeEndInput} placeholder="To DD/MM/YYYY" style={inputStyle} />
          </View>
        )}

        {mode === 'person' && (
          <View style={{ gap: 8 }}>
            <TextInput value={personQuery} onChangeText={setPersonQuery} placeholder="Person name" style={inputStyle} />
            <TextInput value={optionalStartInput} onChangeText={setOptionalStartInput} placeholder="Optional from DD/MM/YYYY" style={inputStyle} />
            <TextInput value={optionalEndInput} onChangeText={setOptionalEndInput} placeholder="Optional to DD/MM/YYYY" style={inputStyle} />
          </View>
        )}

        {mode === 'company' && (
          <View style={{ gap: 8 }}>
            <TextInput value={companyQuery} onChangeText={setCompanyQuery} placeholder="Company name" style={inputStyle} />
            <TextInput value={optionalStartInput} onChangeText={setOptionalStartInput} placeholder="Optional from DD/MM/YYYY" style={inputStyle} />
            <TextInput value={optionalEndInput} onChangeText={setOptionalEndInput} placeholder="Optional to DD/MM/YYYY" style={inputStyle} />
          </View>
        )}

        <TouchableOpacity
          onPress={runSearch}
          style={{
            backgroundColor: '#2563EB',
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: '#B91C1C' }}>{error}</Text>
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: '#6B7280' }}>No sign-ins found for this search.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {results.map((row) => (
            <View
              key={row.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontWeight: '700', color: '#111827', flex: 1 }}>{row.displayName}</Text>
                <Text style={{ color: '#6B7280', fontSize: 12 }}>{row.personType}</Text>
              </View>
              {row.displayCompany ? (
                <Text style={{ color: '#4B5563', marginTop: 4 }}>{row.displayCompany}</Text>
              ) : null}
              <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 13 }}>
                In: {formatDateTime(row.check_in_time)}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                Out: {row.check_out_time ? formatDateTime(row.check_out_time) : 'Still on site'}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                Duration: {formatDuration(row.duration_minutes)}
              </Text>
              {row.visiting_person_name ? (
                <Text style={{ color: '#6B7280', fontSize: 13 }}>
                  Visiting: {row.visiting_person_name}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: '#FFFFFF',
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  listQuestionRows,
  upsertQuestionRow,
  deleteQuestionRow,
  importQuestionsSheet,
  exportQuestionsSheet,
  SHEET_COLUMNS,
} from '../api/permitQuestionnaires';
import {
  QUESTION_TYPE_LABELS,
  OPTIONS_FORMAT,
  QUESTION_TYPE_EXAMPLES,
  SPECIALIZED_PERMIT_LABELS,
  SPECIALIZED_PERMIT_TYPE_KEYS,
} from '../permitQuestionnaire/questionTypes';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';
import { downloadCsv } from '../utils/managerHubExport';

export default function PermitQuestionnaireAdminScreen({ onBack, styles }) {
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBu, setFilterBu] = useState('');
  const [filterPermit, setFilterPermit] = useState('hotWork');
  const [showTypeGuide, setShowTypeGuide] = useState(true);

  const businessUnitsById = useMemo(
    () => Object.fromEntries(businessUnits.map((b) => [b.id, b])),
    [businessUnits],
  );
  const sitesById = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [sites]);
  const businessUnitsByName = useMemo(
    () => Object.fromEntries(businessUnits.map((b) => [b.name, b])),
    [businessUnits],
  );
  const sitesByName = useMemo(() => Object.fromEntries(sites.map((s) => [s.name, s])), [sites]);

  const loadRows = useCallback(async () => {
    if (!filterBu) return;
    setLoading(true);
    try {
      const res = await listQuestionRows({
        businessUnitId: filterBu,
        permitTypeKey: filterPermit,
      });
      setRows(res.data || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load questions');
    } finally {
      setLoading(false);
    }
  }, [filterBu, filterPermit]);

  useEffect(() => {
    (async () => {
      const [bu, siteList] = await Promise.all([listBusinessUnits(), listSites()]);
      setBusinessUnits(Array.isArray(bu) ? bu : []);
      setSites(Array.isArray(siteList) ? siteList : []);
      if (bu?.length && !filterBu) {
        const winstone = bu.find((b) => b.name === 'Winstone Aggregates');
        setFilterBu(winstone?.id || bu[0].id);
      }
    })();
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleExport = () => {
    const csv = exportQuestionsSheet(rows, businessUnitsById, sitesById);
    downloadCsv(`permit-questions-${filterPermit}.csv`, csv);
  };

  const handleImport = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (pick.canceled || !pick.assets?.[0]) return;
      const text = await (await fetch(pick.assets[0].uri)).text();
      const preview = await importQuestionsSheet(
        text,
        { businessUnitsByName, sitesByName },
        { dryRun: true },
      );
      if (!preview.success) {
        Alert.alert('Import', (preview.errors || [preview.error]).join('\n'));
        return;
      }
      Alert.alert('Import', `${preview.rowCount} rows. Import now?`, [
        { text: 'Cancel' },
        {
          text: 'Import',
          onPress: async () => {
            const result = await importQuestionsSheet(
              text,
              { businessUnitsByName, sitesByName },
              { dryRun: false },
            );
            if (!result.success) {
              Alert.alert('Import failed', (result.errors || [result.error]).join('\n'));
            } else {
              loadRows();
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Import failed', e.message);
    }
  };

  const card = {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Permit questions</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <TouchableOpacity onPress={() => setShowTypeGuide((v) => !v)} style={card}>
          <Text style={{ fontWeight: '700' }}>
            Question types & options {showTypeGuide ? '▼' : '▶'}
          </Text>
          {showTypeGuide && (
            <View style={{ marginTop: 8 }}>
              {Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => (
                <Text key={key} style={{ fontSize: 12, marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>{key}</Text> — {label}.{' '}
                  {OPTIONS_FORMAT[key]}
                </Text>
              ))}
              <Text style={{ fontWeight: '600', marginTop: 8, fontSize: 12 }}>Examples</Text>
              {QUESTION_TYPE_EXAMPLES.map((ex) => (
                <Text key={ex.question_type} style={{ fontSize: 11, color: '#4B5563' }}>
                  {ex.question_type}: options="{ex.options}" → {ex.example}
                </Text>
              ))}
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
                CSV columns: {SHEET_COLUMNS.join(', ')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={card}>
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>Business unit</Text>
          {businessUnits.map((bu) => (
            <TouchableOpacity
              key={bu.id}
              onPress={() => setFilterBu(bu.id)}
              style={{
                padding: 8,
                marginBottom: 4,
                borderRadius: 6,
                backgroundColor: filterBu === bu.id ? '#DBEAFE' : '#F3F4F6',
              }}
            >
              <Text>{bu.name}</Text>
            </TouchableOpacity>
          ))}
          <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
            {SPECIALIZED_PERMIT_TYPE_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => setFilterPermit(key)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginRight: 6,
                  borderRadius: 6,
                  backgroundColor: filterPermit === key ? '#7C3AED' : '#E5E7EB',
                }}
              >
                <Text style={{ color: filterPermit === key ? '#fff' : '#111', fontSize: 12 }}>
                  {SPECIALIZED_PERMIT_LABELS[key]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={handleExport}>
              <Text style={styles.addButtonText}>Export sheet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { flex: 1, backgroundColor: '#059669' }]}
              onPress={handleImport}
            >
              <Text style={styles.addButtonText}>Import sheet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ fontWeight: '700', marginBottom: 8 }}>
          Rows ({rows.length}) — run migrations/add-permit-questions-flat-table.sql and{' '}
          scripts/seed-permit-questions-from-defaults.mjs if empty
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : rows.length === 0 ? (
          <Text style={{ color: '#6B7280' }}>No rows in database for this filter.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={[card, { borderLeftWidth: 4, borderLeftColor: '#DC2626' }]}>
              <Text style={{ fontSize: 11, color: '#6B7280' }}>
                #{row.question_number} · {row.question_id} ·{' '}
                {row.site_id ? sitesById[row.site_id]?.name || 'Site' : 'All Sites'} ·{' '}
                {row.question_type}
              </Text>
              <Text style={{ marginVertical: 6 }}>{row.question_text}</Text>
              {row.options ? (
                <Text style={{ fontSize: 12, color: '#374151' }}>Options: {row.options}</Text>
              ) : null}
              {row.depends_on_question_id ? (
                <Text style={{ fontSize: 11, color: '#6B7280' }}>
                  If {row.depends_on_question_id} = {row.depends_on_value}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
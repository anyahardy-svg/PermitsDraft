import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
  Platform,
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
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  OPTIONS_FORMAT,
  QUESTION_TYPE_EXAMPLES,
  SPECIALIZED_PERMIT_LABELS,
  SPECIALIZED_PERMIT_TYPE_KEYS,
} from '../permitQuestionnaire/questionTypes';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';
import { downloadCsv } from '../utils/managerHubExport';

const emptyForm = {
  id: null,
  permit_type_key: 'hotWork',
  question_number: '1',
  question_id: '',
  business_unit_id: '',
  site_id: null,
  site_scope: 'all',
  question_text: '',
  question_type: 'yesno',
  options: '',
  required: false,
  depends_on_question_id: '',
  depends_on_value: '',
  note: '',
  is_published: true,
};

function confirmDelete(message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('Delete question?', message, [
      { text: 'Cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function PermitQuestionnaireAdminScreen({ onBack, styles }) {
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterBu, setFilterBu] = useState('');
  const [filterPermit, setFilterPermit] = useState('hotWork');
  const [showTypeGuide, setShowTypeGuide] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);

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

  const sitesForBu = useMemo(
    () => sites.filter((s) => (s.business_unit_id || s.businessUnitId) === filterBu),
    [sites, filterBu],
  );

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

  const openNewQuestion = () => {
    const maxNum = rows.reduce((m, r) => Math.max(m, Number(r.question_number) || 0), 0);
    setForm({
      ...emptyForm,
      id: null,
      permit_type_key: filterPermit,
      business_unit_id: filterBu,
      question_number: String(maxNum + 1),
      site_scope: 'all',
      site_id: null,
    });
    setEditModalVisible(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      permit_type_key: row.permit_type_key,
      question_number: String(row.question_number),
      question_id: row.question_id,
      business_unit_id: row.business_unit_id,
      site_id: row.site_id,
      site_scope: row.site_id ? 'site' : 'all',
      question_text: row.question_text,
      question_type: row.question_type,
      options: row.options || '',
      required: Boolean(row.required),
      depends_on_question_id: row.depends_on_question_id || '',
      depends_on_value: row.depends_on_value || '',
      note: row.note || '',
      is_published: row.is_published !== false,
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.question_id?.trim() || !form.question_text?.trim()) {
      Alert.alert('Validation', 'Question ID and question text are required.');
      return;
    }
    if (!form.question_type) {
      Alert.alert('Validation', 'Question type is required.');
      return;
    }
    setSaving(true);
    try {
      const siteId = form.site_scope === 'site' ? form.site_id : null;
      if (form.site_scope === 'site' && !siteId) {
        Alert.alert('Validation', 'Select a site for site-specific questions.');
        setSaving(false);
        return;
      }
      await upsertQuestionRow({
        id: form.id,
        permit_type_key: form.permit_type_key,
        question_number: Number(form.question_number),
        question_id: form.question_id.trim(),
        business_unit_id: form.business_unit_id,
        site_id: siteId,
        question_text: form.question_text.trim(),
        question_type: form.question_type,
        options: form.options?.trim() || null,
        required: form.required,
        depends_on_question_id: form.depends_on_question_id?.trim() || null,
        depends_on_value: form.depends_on_value?.trim() || null,
        note: form.note?.trim() || null,
        is_published: form.is_published,
      });
      setEditModalVisible(false);
      loadRows();
    } catch (err) {
      Alert.alert('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirmDelete(`Remove question #${row.question_number} (${row.question_id})?`);
    if (!ok) return;
    try {
      await deleteQuestionRow(row.id);
      loadRows();
    } catch (err) {
      Alert.alert('Delete failed', err.message);
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

  const th = {
    flex: 1,
    minWidth: 90,
    padding: 8,
    fontWeight: '700',
    fontSize: 12,
    color: '#374151',
    backgroundColor: '#F3F4F6',
  };

  const td = {
    flex: 1,
    minWidth: 90,
    padding: 8,
    fontSize: 12,
    color: '#111827',
  };

  const inputStyle = styles.input || {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
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
                  <Text style={{ fontWeight: '600' }}>{key}</Text> — {label}. {OPTIONS_FORMAT[key]}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>

        <View style={card}>
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>Business unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {businessUnits.map((bu) => (
              <TouchableOpacity
                key={bu.id}
                onPress={() => setFilterBu(bu.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginRight: 6,
                  borderRadius: 6,
                  backgroundColor: filterBu === bu.id ? '#DBEAFE' : '#F3F4F6',
                }}
              >
                <Text style={{ fontSize: 13 }}>{bu.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal style={{ marginTop: 10 }} showsHorizontalScrollIndicator={false}>
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
          <View style={{ flexDirection: 'row', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity style={[styles.addButton, { paddingHorizontal: 16 }]} onPress={openNewQuestion}>
              <Text style={styles.addButtonText}>+ Add new question</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: '#4B5563' }]} onPress={handleExport}>
              <Text style={styles.addButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#059669' }]}
              onPress={handleImport}
            >
              <Text style={styles.addButtonText}>Import</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[card, { padding: 0, overflow: 'hidden' }]}>
          <ScrollView horizontal>
            <View style={{ minWidth: 900 }}>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ ...th, flex: 0.4, minWidth: 48 }}>#</Text>
                <Text style={{ ...th, flex: 0.9, minWidth: 100 }}>Sites</Text>
                <Text style={{ ...th, flex: 2, minWidth: 220 }}>Question</Text>
                <Text style={{ ...th, flex: 0.8, minWidth: 100 }}>Type</Text>
                <Text style={{ ...th, flex: 1.2, minWidth: 140 }}>Options</Text>
                <Text style={{ ...th, flex: 0.9, minWidth: 120 }}>Question ID</Text>
                <Text style={{ ...th, flex: 1, minWidth: 140 }}>Actions</Text>
              </View>

              {loading ? (
                <ActivityIndicator style={{ margin: 24 }} />
              ) : rows.length === 0 ? (
                <Text style={{ padding: 16, color: '#6B7280' }}>No questions for this filter.</Text>
              ) : (
                rows.map((row, idx) => (
                  <View
                    key={row.id}
                    style={{
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      borderColor: '#F3F4F6',
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                    }}
                  >
                    <Text style={{ ...td, flex: 0.4, minWidth: 48 }}>{row.question_number}</Text>
                    <Text style={{ ...td, flex: 0.9, minWidth: 100 }}>
                      {row.site_id ? sitesById[row.site_id]?.name || 'Site' : 'All Sites'}
                    </Text>
                    <Text style={{ ...td, flex: 2, minWidth: 220 }} numberOfLines={3}>
                      {row.question_text}
                    </Text>
                    <Text style={{ ...td, flex: 0.8, minWidth: 100 }}>{row.question_type}</Text>
                    <Text style={{ ...td, flex: 1.2, minWidth: 140 }} numberOfLines={2}>
                      {row.options || '—'}
                    </Text>
                    <Text style={{ ...td, flex: 0.9, minWidth: 120 }}>{row.question_id}</Text>
                    <View
                      style={{
                        ...td,
                        flex: 1,
                        minWidth: 140,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => openEdit(row)}
                        style={{
                          backgroundColor: '#2563EB',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(row)}
                        style={{
                          backgroundColor: '#DC2626',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <ScrollView
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              maxHeight: '90%',
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              {form.id ? 'Edit question' : 'Add new question'}
            </Text>

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Question number</Text>
            <TextInput
              style={inputStyle}
              value={form.question_number}
              onChangeText={(t) => setForm((f) => ({ ...f, question_number: t }))}
              keyboardType="decimal-pad"
            />

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Question ID (stable key)</Text>
            <TextInput
              style={inputStyle}
              value={form.question_id}
              onChangeText={(t) => setForm((f) => ({ ...f, question_id: t }))}
              editable={!form.id}
              placeholder="e.g. workshop_alternative"
            />

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Sites</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, site_scope: 'all', site_id: null }))}
                style={{
                  padding: 8,
                  marginRight: 8,
                  borderRadius: 6,
                  backgroundColor: form.site_scope === 'all' ? '#D1FAE5' : '#F3F4F6',
                }}
              >
                <Text>All Sites</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, site_scope: 'site' }))}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  backgroundColor: form.site_scope === 'site' ? '#D1FAE5' : '#F3F4F6',
                }}
              >
                <Text>One site only</Text>
              </TouchableOpacity>
            </View>
            {form.site_scope === 'site' && (
              <ScrollView horizontal style={{ marginBottom: 8 }}>
                {sitesForBu.map((site) => (
                  <TouchableOpacity
                    key={site.id}
                    onPress={() => setForm((f) => ({ ...f, site_id: site.id }))}
                    style={{
                      padding: 8,
                      marginRight: 6,
                      borderRadius: 6,
                      backgroundColor: form.site_id === site.id ? '#DBEAFE' : '#F3F4F6',
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{site.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Question text</Text>
            <TextInput
              style={[inputStyle, { minHeight: 72 }]}
              multiline
              value={form.question_text}
              onChangeText={(t) => setForm((f) => ({ ...f, question_text: t }))}
            />

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Question type</Text>
            <ScrollView horizontal style={{ marginBottom: 8 }}>
              {QUESTION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setForm((f) => ({ ...f, question_type: t }))}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    marginRight: 6,
                    borderRadius: 6,
                    backgroundColor: form.question_type === t ? '#7C3AED' : '#E5E7EB',
                  }}
                >
                  <Text
                    style={{ fontSize: 11, color: form.question_type === t ? '#fff' : '#111' }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
              {OPTIONS_FORMAT[form.question_type]}
            </Text>

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Options</Text>
            <TextInput
              style={inputStyle}
              multiline
              value={form.options}
              onChangeText={(t) => setForm((f) => ({ ...f, options: t }))}
              placeholder="Yes; No or JSON for multi_checkbox"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '600', marginRight: 8 }}>Required</Text>
              <Switch
                value={form.required}
                onValueChange={(v) => setForm((f) => ({ ...f, required: v }))}
              />
            </View>

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Depends on question ID (optional)</Text>
            <TextInput
              style={inputStyle}
              value={form.depends_on_question_id}
              onChangeText={(t) => setForm((f) => ({ ...f, depends_on_question_id: t }))}
            />
            <TextInput
              style={inputStyle}
              value={form.depends_on_value}
              onChangeText={(t) => setForm((f) => ({ ...f, depends_on_value: t }))}
              placeholder="depends_on_value e.g. yes or no"
            />

            <TextInput
              style={inputStyle}
              value={form.note}
              onChangeText={(t) => setForm((f) => ({ ...f, note: t }))}
              placeholder="Note (optional)"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={{ padding: 12 }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.addButton, { opacity: saving ? 0.6 : 1 }]}
              >
                <Text style={styles.addButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
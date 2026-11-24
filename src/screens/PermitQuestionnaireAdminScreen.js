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
import { downloadCsvText } from '../utils/managerHubExport';

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

const TYPES_WITHOUT_OPTIONS = new Set([
  'yesno',
  'yesnona',
  'yesno_text',
  'text',
  'section',
  'attachment',
  'contractor_lookup',
]);

function suggestQuestionId(text, existingIds) {
  let base = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  if (!base) base = 'new_question';
  let id = base;
  let n = 2;
  const taken = existingIds || new Set();
  while (taken.has(id)) {
    id = `${base}_${n}`;
    n += 1;
  }
  return id;
}

function dependsValueChoices(parentRow) {
  if (!parentRow) return ['yes', 'no'];
  const t = parentRow.question_type;
  if (t === 'yesno') return ['yes', 'no'];
  if (t === 'yesnona') return ['yes', 'no', 'n/a'];
  if (t === 'radio') {
    const raw = (parentRow.options || '').trim();
    if (raw) {
      return raw
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return ['yes', 'no'];
}

function nextQuestionNumber(rows, afterRow = null) {
  if (afterRow != null) {
    return String(Number(afterRow.question_number) + 1);
  }
  const maxNum = rows.reduce((m, r) => Math.max(m, Number(r.question_number) || 0), 0);
  return String(maxNum + 1);
}

function formFromRow(row, overrides = {}) {
  return {
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
    ...overrides,
  };
}

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
  const [questionIdTouched, setQuestionIdTouched] = useState(false);
  const [parentLookupQuery, setParentLookupQuery] = useState('');

  const existingQuestionIds = useMemo(
    () => new Set(rows.map((r) => r.question_id).filter(Boolean)),
    [rows],
  );

  const parentRowForForm = useMemo(
    () => rows.find((r) => r.question_id === form.depends_on_question_id) || null,
    [rows, form.depends_on_question_id],
  );

  const dependsChoices = useMemo(
    () => dependsValueChoices(parentRowForForm),
    [parentRowForForm],
  );

  const rowsByQuestionId = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.question_id, r])),
    [rows],
  );

  const parentQuestionCandidates = useMemo(() => {
    const myNum = Number(form.question_number);
    return rows
      .filter((r) => {
        if (form.id && r.id === form.id) return false;
        if (form.question_id && r.question_id === form.question_id) return false;
        if (Number.isFinite(myNum) && Number(r.question_number) >= myNum) return false;
        return true;
      })
      .sort((a, b) => Number(a.question_number) - Number(b.question_number));
  }, [rows, form.id, form.question_id, form.question_number]);

  const filteredParentCandidates = useMemo(() => {
    const q = parentLookupQuery.trim().toLowerCase();
    if (!q) return parentQuestionCandidates;
    return parentQuestionCandidates.filter((r) => {
      const haystack = `#${r.question_number} ${r.question_id} ${r.question_text} ${QUESTION_TYPE_LABELS[r.question_type] || r.question_type}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [parentQuestionCandidates, parentLookupQuery]);

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
    if (!rows.length) {
      Alert.alert('Export', 'No questions loaded for this filter. Pick a business unit and permit type first.');
      return;
    }
    const csv = exportQuestionsSheet(rows, businessUnitsById, sitesById);
    const buName = businessUnitsById[filterBu]?.name?.replace(/\s+/g, '-') || 'bu';
    const filename = `permit-questions-${filterPermit}-${buName}.csv`;
    const ok = downloadCsvText(filename, csv);
    if (!ok) {
      Alert.alert('Export', 'CSV download is only available in the web browser.');
    }
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

  const pickParentQuestion = (parentRow) => {
    setForm((f) => ({
      ...f,
      depends_on_question_id: parentRow.question_id,
      depends_on_value:
        f.depends_on_value ||
        (parentRow.question_type === 'yesno' || parentRow.question_type === 'yesnona' ? 'yes' : ''),
    }));
  };

  const clearParentQuestion = () => {
    setForm((f) => ({ ...f, depends_on_question_id: '', depends_on_value: '' }));
    setParentLookupQuery('');
  };

  const openNewQuestion = () => {
    setQuestionIdTouched(false);
    setParentLookupQuery('');
    setForm({
      ...emptyForm,
      id: null,
      permit_type_key: filterPermit,
      business_unit_id: filterBu,
      question_number: nextQuestionNumber(rows),
      site_scope: 'all',
      site_id: null,
    });
    setEditModalVisible(true);
  };

  const openFollowUp = (parentRow) => {
    const parentType = parentRow.question_type;
    const defaultWhen =
      parentType === 'yesno' || parentType === 'yesnona' ? 'yes' : '';
    setQuestionIdTouched(false);
    setParentLookupQuery('');
    setForm({
      ...emptyForm,
      id: null,
      permit_type_key: filterPermit,
      business_unit_id: filterBu,
      question_number: nextQuestionNumber(rows, parentRow),
      site_scope: parentRow.site_id ? 'site' : 'all',
      site_id: parentRow.site_id || null,
      depends_on_question_id: parentRow.question_id,
      depends_on_value: defaultWhen,
      question_type: 'yesno',
    });
    setEditModalVisible(true);
  };

  const openEdit = (row) => {
    setQuestionIdTouched(true);
    setParentLookupQuery('');
    setForm(formFromRow(row));
    setEditModalVisible(true);
  };

  const suggestIdFromText = () => {
    const id = suggestQuestionId(form.question_text, existingQuestionIds);
    setForm((f) => ({ ...f, question_id: id }));
    setQuestionIdTouched(true);
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
            <View style={{ minWidth: 1100 }}>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ ...th, flex: 0.4, minWidth: 48 }}>#</Text>
                <Text style={{ ...th, flex: 0.9, minWidth: 100 }}>Sites</Text>
                <Text style={{ ...th, flex: 2, minWidth: 200 }}>Question</Text>
                <Text style={{ ...th, flex: 0.8, minWidth: 88 }}>Type</Text>
                <Text style={{ ...th, flex: 1.3, minWidth: 180 }}>Depends on</Text>
                <Text style={{ ...th, flex: 1.0, minWidth: 120 }}>Options</Text>
                <Text style={{ ...th, flex: 0.8, minWidth: 100 }}>Question ID</Text>
                <Text style={{ ...th, flex: 1, minWidth: 200 }}>Actions</Text>
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
                    <Text style={{ ...td, flex: 0.8, minWidth: 88 }}>
                      {QUESTION_TYPE_LABELS[row.question_type] || row.question_type}
                    </Text>
                    <Text style={{ ...td, flex: 1.3, minWidth: 180 }} numberOfLines={3}>
                      {row.depends_on_question_id ? (
                        <>
                          {(() => {
                            const parent = rowsByQuestionId[row.depends_on_question_id];
                            if (parent) {
                              return `#${parent.question_number} ${parent.question_text}`;
                            }
                            return row.depends_on_question_id;
                          })()}
                          {row.depends_on_value ? (
                            <Text style={{ color: '#059669', fontWeight: '600' }}>
                              {' '}
                              → {row.depends_on_value}
                            </Text>
                          ) : null}
                        </>
                      ) : (
                        'Always'
                      )}
                    </Text>
                    <Text style={{ ...td, flex: 1.0, minWidth: 120 }} numberOfLines={2}>
                      {row.options || '—'}
                    </Text>
                    <Text style={{ ...td, flex: 0.8, minWidth: 100 }}>{row.question_id}</Text>
                    <View
                      style={{
                        ...td,
                        flex: 1,
                        minWidth: 200,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => openFollowUp(row)}
                        style={{
                          backgroundColor: '#059669',
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Follow-up</Text>
                      </TouchableOpacity>
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
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
              {form.id ? 'Edit question' : 'Add new question'}
            </Text>
            {!form.id && (
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 18 }}>
                  1. Write what the permit holder sees{'\n'}
                  2. Pick a type (usually Yes / No){'\n'}
                  3. To show it only after another answer, use “Show only when…” — or click{' '}
                  <Text style={{ fontWeight: '700' }}>Follow-up</Text> on that row in the table.
                </Text>
              </View>
            )}

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Question text</Text>
            <TextInput
              style={[inputStyle, { minHeight: 72 }]}
              multiline
              value={form.question_text}
              onChangeText={(t) => {
                setForm((f) => {
                  const next = { ...f, question_text: t };
                  if (!f.id && !questionIdTouched && t.trim().length > 8) {
                    next.question_id = suggestQuestionId(t, existingQuestionIds);
                  }
                  return next;
                });
              }}
              placeholder="What should the permit ask?"
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text style={{ fontWeight: '600' }}>
                Internal ID {form.id ? '' : '(saved on permits)'}
              </Text>
              {!form.id && (
                <TouchableOpacity onPress={suggestIdFromText}>
                  <Text style={{ color: '#2563EB', fontSize: 12 }}>Regenerate from text</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={inputStyle}
              value={form.question_id}
              onChangeText={(t) => {
                setQuestionIdTouched(true);
                setForm((f) => ({ ...f, question_id: t }));
              }}
              editable={!form.id}
              placeholder="e.g. grinders"
              autoCapitalize="none"
            />
            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
              Short snake_case name. Do not change after go-live — follow-up questions link to this.
            </Text>

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

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Answer type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {QUESTION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setForm((f) => ({ ...f, question_type: t }))}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginRight: 6,
                    marginBottom: 6,
                    borderRadius: 6,
                    backgroundColor: form.question_type === t ? '#7C3AED' : '#E5E7EB',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: form.question_type === t ? '#fff' : '#111',
                      fontWeight: form.question_type === t ? '600' : '400',
                    }}
                  >
                    {QUESTION_TYPE_LABELS[t] || t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
              {OPTIONS_FORMAT[form.question_type]}
              {(() => {
                const ex = QUESTION_TYPE_EXAMPLES.find((e) => e.question_type === form.question_type);
                return ex?.example ? ` Example: ${ex.example}` : '';
              })()}
            </Text>

            {!TYPES_WITHOUT_OPTIONS.has(form.question_type) && (
              <>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>Choices</Text>
                <TextInput
                  style={inputStyle}
                  multiline
                  value={form.options}
                  onChangeText={(t) => setForm((f) => ({ ...f, options: t }))}
                  placeholder={
                    form.question_type === 'radio'
                      ? 'Option A; Option B; Option C'
                      : 'JSON for checkboxes — or export a sample row and copy'
                  }
                />
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '600', marginRight: 8 }}>Required answer</Text>
              <Switch
                value={form.required}
                onValueChange={(v) => setForm((f) => ({ ...f, required: v }))}
              />
            </View>

            <View
              style={{
                borderWidth: 1,
                borderColor: form.depends_on_question_id ? '#A7F3D0' : '#E5E7EB',
                borderRadius: 8,
                padding: 10,
                marginBottom: 12,
                backgroundColor: form.depends_on_question_id ? '#F0FDF4' : '#FAFAFA',
              }}
            >
              <Text style={{ fontWeight: '700', marginBottom: 4 }}>Show only when… (optional)</Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                Pick a question from this {SPECIALIZED_PERMIT_LABELS[filterPermit] || filterPermit}{' '}
                list (only questions above this one in display order).
              </Text>
              {form.depends_on_question_id && parentRowForForm ? (
                <View
                  style={{
                    backgroundColor: '#DCFCE7',
                    padding: 8,
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600' }}>Selected parent</Text>
                  <Text style={{ fontSize: 12 }}>
                    #{parentRowForForm.question_number} · {parentRowForForm.question_text}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>
                    ID: {parentRowForForm.question_id} ·{' '}
                    {QUESTION_TYPE_LABELS[parentRowForForm.question_type] ||
                      parentRowForForm.question_type}
                  </Text>
                </View>
              ) : form.depends_on_question_id ? (
                <Text style={{ fontSize: 11, color: '#B45309', marginBottom: 8 }}>
                  Current parent ID “{form.depends_on_question_id}” is not in this list — search below
                  to replace it.
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', marginBottom: 8, gap: 8 }}>
                <TouchableOpacity
                  onPress={clearParentQuestion}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: !form.depends_on_question_id ? '#D1FAE5' : '#F3F4F6',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600' }}>Always show</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[inputStyle, { marginBottom: 6 }]}
                value={parentLookupQuery}
                onChangeText={setParentLookupQuery}
                placeholder="Search questions on this permit…"
                autoCapitalize="none"
              />
              <ScrollView
                style={{
                  maxHeight: 200,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 6,
                  marginBottom: 8,
                }}
                nestedScrollEnabled
              >
                {filteredParentCandidates.length === 0 ? (
                  <Text style={{ padding: 12, color: '#6B7280', fontSize: 12 }}>
                    {parentQuestionCandidates.length === 0
                      ? 'No earlier questions yet — add the parent question first, or lower this display order.'
                      : 'No matches — try another search.'}
                  </Text>
                ) : (
                  filteredParentCandidates.map((r) => {
                    const selected = form.depends_on_question_id === r.question_id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => pickParentQuestion(r)}
                        style={{
                          padding: 10,
                          borderBottomWidth: 1,
                          borderColor: '#F3F4F6',
                          backgroundColor: selected ? '#BBF7D0' : '#fff',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700' }}>
                          #{r.question_number}{' '}
                          <Text style={{ fontWeight: '400', color: '#6B7280' }}>({r.question_id})</Text>
                        </Text>
                        <Text style={{ fontSize: 12 }} numberOfLines={2}>
                          {r.question_text}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                          {QUESTION_TYPE_LABELS[r.question_type] || r.question_type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              {form.depends_on_question_id ? (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                    When the answer is
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                    {dependsChoices.map((v) => (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setForm((f) => ({ ...f, depends_on_value: v }))}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          marginRight: 6,
                          marginBottom: 6,
                          borderRadius: 6,
                          backgroundColor:
                            form.depends_on_value === v ? '#2563EB' : '#E5E7EB',
                        }}
                      >
                        <Text
                          style={{
                            color: form.depends_on_value === v ? '#fff' : '#111',
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {v === 'n/a' ? 'N/A' : v.charAt(0).toUpperCase() + v.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={inputStyle}
                    value={form.depends_on_value}
                    onChangeText={(t) => setForm((f) => ({ ...f, depends_on_value: t }))}
                    placeholder="Or type exact value (e.g. ladder for equipment choice)"
                  />
                </>
              ) : null}
            </View>

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Display order</Text>
            <TextInput
              style={inputStyle}
              value={form.question_number}
              onChangeText={(t) => setForm((f) => ({ ...f, question_number: t }))}
              keyboardType="decimal-pad"
            />
            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
              Lower numbers appear higher on the permit. Follow-up uses parent number + 1; adjust if
              two rows share the same slot.
            </Text>

            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Note on permit (optional)</Text>
            <TextInput
              style={inputStyle}
              value={form.note}
              onChangeText={(t) => setForm((f) => ({ ...f, note: t }))}
              placeholder="Small grey text under the question"
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
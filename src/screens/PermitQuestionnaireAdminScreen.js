import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { DEFAULT_PERMIT_QUESTIONNAIRES } from '../permitQuestionnaire/defaults';
import { SPECIALIZED_PERMIT_TYPE_KEYS } from '../permitQuestionnaire/schema';
import { mergeQuestions } from '../permitQuestionnaire/merge';
import {
  listBaseSets,
  listSiteAdditions,
  saveBaseSet,
  publishBaseSet,
  saveSiteQuestion,
  deleteSiteQuestion,
  importQuestionnaireCsv,
  exportQuestionnaireCsv,
} from '../api/permitQuestionnaires';
import { listBusinessUnits } from '../api/business_units';
import { listSites } from '../api/sites';
import { downloadCsv } from '../utils/managerHubExport';

const PERMIT_LABELS = {
  hotWork: 'Hot Work Permit',
  confinedSpace: 'Confined Space',
  electrical: 'Electrical',
  excavation: 'Excavation',
  lifting: 'Lifting',
  mobilePlantServicing: 'Mobile Plant Servicing',
  plantServicing: 'Fixed Plant Servicing',
  stripping: 'Stripping',
  surveying: 'Surveying',
  workingAtHeight: 'Working at Height',
  blastingMarking: 'Blasting - 1 Marking',
  blastingDrilling: 'Blasting - 2 Drilling',
  blastingExecution: 'Blasting - 3 Execution',
};

/**
 * Admin: BU-wide base questionnaires + site-only extra questions (additive merge).
 * Reach via /admin/permit-questionnaires/ when wired in App.js routing.
 */
export default function PermitQuestionnaireAdminScreen({ onBack, styles }) {
  const [businessUnits, setBusinessUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [permitTypeKey, setPermitTypeKey] = useState('hotWork');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [baseQuestions, setBaseQuestions] = useState([]);
  const [siteExtras, setSiteExtras] = useState([]);
  const [baseSetId, setBaseSetId] = useState(null);
  const [editingExtraId, setEditingExtraId] = useState(null);
  const [extraForm, setExtraForm] = useState({
    id: '',
    text: '',
    type: 'yesno',
    required: true,
    insert_after_question_id: '',
    sort_order: '1000',
  });

  const sitesForBu = useMemo(
    () => sites.filter((s) => s.business_unit_id === businessUnitId || s.businessUnitId === businessUnitId),
    [sites, businessUnitId],
  );

  const mergedPreview = useMemo(
    () => mergeQuestions(baseQuestions, siteExtras.filter((r) => r.is_published !== false)),
    [baseQuestions, siteExtras],
  );

  const loadConfig = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    try {
      const [baseRes, siteRes] = await Promise.all([
        listBaseSets({ businessUnitId, permitTypeKey }),
        siteFilter
          ? listSiteAdditions({ businessUnitId, siteId: siteFilter, permitTypeKey })
          : Promise.resolve({ success: true, data: [] }),
      ]);

      const published = (baseRes.data || []).find((r) => r.is_published);
      const draft = (baseRes.data || []).find((r) => !r.is_published);
      const active = published || draft;

      if (active) {
        setBaseSetId(active.id);
        setBaseQuestions(Array.isArray(active.questions) ? active.questions : []);
      } else {
        setBaseSetId(null);
        setBaseQuestions(DEFAULT_PERMIT_QUESTIONNAIRES[permitTypeKey] || []);
      }

      setSiteExtras(siteRes.data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to load questionnaires');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, permitTypeKey, siteFilter]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [buData, sitesData] = await Promise.all([listBusinessUnits(), listSites()]);
        setBusinessUnits(Array.isArray(buData) ? buData : []);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to load sites');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handlePublishBase = async () => {
    if (!businessUnitId) return;
    setSaving(true);
    try {
      const result = await saveBaseSet({
        id: baseSetId,
        permitTypeKey,
        businessUnitId,
        questions: baseQuestions,
        publish: false,
      });
      const row = result.data;
      await publishBaseSet(row.id);
      setBaseSetId(row.id);
      Alert.alert('Published', 'Base questionnaire published for this business unit.');
      await loadConfig();
    } catch (err) {
      Alert.alert('Error', err.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSiteExtra = async () => {
    if (!siteFilter || !businessUnitId) {
      Alert.alert('Site required', 'Select a site to add a site-only question.');
      return;
    }
    if (!extraForm.id?.trim() || !extraForm.text?.trim()) {
      Alert.alert('Validation', 'Question id and text are required.');
      return;
    }
    setSaving(true);
    try {
      const question = {
        id: extraForm.id.trim(),
        text: extraForm.text.trim(),
        type: extraForm.type || 'yesno',
        required: Boolean(extraForm.required),
      };
      await saveSiteQuestion({
        id: editingExtraId,
        permitTypeKey,
        businessUnitId,
        siteId: siteFilter,
        question,
        sortOrder: extraForm.sort_order ? Number(extraForm.sort_order) : 1000,
        insertAfterQuestionId: extraForm.insert_after_question_id || null,
        publish: true,
      });
      setExtraForm({
        id: '',
        text: '',
        type: 'yesno',
        required: true,
        insert_after_question_id: '',
        sort_order: '1000',
      });
      setEditingExtraId(null);
      await loadConfig();
    } catch (err) {
      Alert.alert('Error', err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const allBase = businessUnitId
        ? (await listBaseSets({ businessUnitId, permitTypeKey })).data || []
        : [];
      const allSite = siteFilter
        ? (await listSiteAdditions({ businessUnitId, siteId: siteFilter, permitTypeKey })).data || []
        : [];

      const businessUnitsById = Object.fromEntries(businessUnits.map((b) => [b.id, b]));
      const sitesById = Object.fromEntries(sites.map((s) => [s.id, s]));
      const csv = exportQuestionnaireCsv({
        baseSets: allBase.filter((s) => s.questions?.length),
        siteRows: allSite,
        businessUnitsById,
        sitesById,
      });
      downloadCsv(`permit-questionnaires-${permitTypeKey}.csv`, csv);
    } catch (err) {
      Alert.alert('Error', err.message || 'Export failed');
    }
  };

  const handleImportCsv = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (pick.canceled || !pick.assets?.[0]) return;
      const uri = pick.assets[0].uri;
      const resp = await fetch(uri);
      const text = await resp.text();
      const businessUnitsByName = Object.fromEntries(businessUnits.map((b) => [b.name, b]));
      const sitesByName = Object.fromEntries(sites.map((s) => [s.name, s]));
      const dry = await importQuestionnaireCsv(text, { businessUnitsByName, sitesByName }, { dryRun: true });
      if (!dry.success) {
        Alert.alert('Import preview failed', (dry.errors || [dry.error]).join('\n'));
        return;
      }
      Alert.alert(
        'Import preview',
        `Base sets: ${dry.baseSets}, site additions: ${dry.siteAdditions}. Proceed?`,
        [
          { text: 'Cancel' },
          {
            text: 'Import',
            onPress: async () => {
              const result = await importQuestionnaireCsv(
                text,
                { businessUnitsByName, sitesByName },
                { dryRun: false },
              );
              if (!result.success) {
                Alert.alert('Import failed', (result.errors || [result.error]).join('\n'));
              } else {
                Alert.alert('Done', 'CSV imported.');
                loadConfig();
              }
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Import failed');
    }
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Permit questionnaires</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={cardStyle}>
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>Permit type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SPECIALIZED_PERMIT_TYPE_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginRight: 8,
                    borderRadius: 6,
                    backgroundColor: permitTypeKey === key ? '#7C3AED' : '#E5E7EB',
                  }}
                  onPress={() => setPermitTypeKey(key)}
                >
                  <Text style={{ color: permitTypeKey === key ? '#fff' : '#111' }}>
                    {PERMIT_LABELS[key] || key}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Business unit</Text>
            {businessUnits.map((bu) => (
              <TouchableOpacity
                key={bu.id}
                style={{
                  padding: 10,
                  marginBottom: 4,
                  borderRadius: 6,
                  backgroundColor: businessUnitId === bu.id ? '#DBEAFE' : '#F3F4F6',
                }}
                onPress={() => {
                  setBusinessUnitId(bu.id);
                  setSiteFilter('');
                }}
              >
                <Text>{bu.name}</Text>
              </TouchableOpacity>
            ))}

            {businessUnitId ? (
              <>
                <Text style={{ fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
                  Site (all sites = base only; pick site = manage extras)
                </Text>
                <TouchableOpacity
                  style={{
                    padding: 10,
                    marginBottom: 4,
                    borderRadius: 6,
                    backgroundColor: !siteFilter ? '#D1FAE5' : '#F3F4F6',
                  }}
                  onPress={() => setSiteFilter('')}
                >
                  <Text>All sites (edit base)</Text>
                </TouchableOpacity>
                {sitesForBu.map((site) => (
                  <TouchableOpacity
                    key={site.id}
                    style={{
                      padding: 10,
                      marginBottom: 4,
                      borderRadius: 6,
                      backgroundColor: siteFilter === site.id ? '#D1FAE5' : '#F3F4F6',
                    }}
                    onPress={() => setSiteFilter(site.id)}
                  >
                    <Text>{site.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={handleExportCsv} disabled={!businessUnitId}>
              <Text style={styles.addButtonText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { flex: 1, backgroundColor: '#059669' }]} onPress={handleImportCsv}>
              <Text style={styles.addButtonText}>Import CSV</Text>
            </TouchableOpacity>
          </View>

          {!siteFilter ? (
            <View style={cardStyle}>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>
                Base questions ({baseQuestions.length}) — {PERMIT_LABELS[permitTypeKey] || permitTypeKey}
              </Text>
              <Text style={{ color: '#6B7280', marginBottom: 12, fontSize: 13 }}>
                Edit JSON in a future release; for now publish copies the loaded set (defaults until you publish a customized
                export/import). Use CSV to bulk-edit base questions.
              </Text>
              {baseQuestions.slice(0, 8).map((q) => (
                <Text key={q.id} style={{ marginBottom: 6, fontSize: 13 }}>
                  • {q.id}: {q.text?.substring(0, 80)}
                  {q.text?.length > 80 ? '…' : ''}
                </Text>
              ))}
              {baseQuestions.length > 8 ? (
                <Text style={{ color: '#6B7280' }}>…and {baseQuestions.length - 8} more</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.addButton, { marginTop: 12, opacity: saving ? 0.6 : 1 }]}
                onPress={handlePublishBase}
                disabled={saving || !businessUnitId}
              >
                <Text style={styles.addButtonText}>{saving ? 'Saving…' : 'Publish base to database'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={cardStyle}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>Base (read-only reference)</Text>
                {baseQuestions.slice(0, 5).map((q) => (
                  <Text key={q.id} style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>
                    {q.id}
                  </Text>
                ))}
              </View>

              <View style={cardStyle}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>Site-only questions</Text>
                {siteExtras.length === 0 ? (
                  <Text style={{ color: '#6B7280' }}>No extra questions for this site yet.</Text>
                ) : (
                  siteExtras.map((row) => (
                    <View
                      key={row.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 13 }}>{row.question?.text}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingExtraId(row.id);
                          setExtraForm({
                            id: row.question?.id || '',
                            text: row.question?.text || '',
                            type: row.question?.type || 'yesno',
                            required: Boolean(row.question?.required),
                            insert_after_question_id: row.insert_after_question_id || '',
                            sort_order: String(row.sort_order ?? '1000'),
                          });
                        }}
                      >
                        <Text style={{ color: '#7C3AED' }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Delete', 'Remove this site-only question?', [
                            { text: 'Cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                await deleteSiteQuestion(row.id);
                                loadConfig();
                              },
                            },
                          ]);
                        }}
                      >
                        <Text style={{ color: '#DC2626', marginLeft: 8 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <Text style={{ fontWeight: '600', marginTop: 12 }}>Add / edit site question</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Question id (unique)"
                  value={extraForm.id}
                  onChangeText={(t) => setExtraForm((f) => ({ ...f, id: t }))}
                />
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder="Question text"
                  multiline
                  value={extraForm.text}
                  onChangeText={(t) => setExtraForm((f) => ({ ...f, text: t }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Insert after question id (optional)"
                  value={extraForm.insert_after_question_id}
                  onChangeText={(t) => setExtraForm((f) => ({ ...f, insert_after_question_id: t }))}
                />
                <TouchableOpacity
                  style={[styles.addButton, { marginTop: 8, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSaveSiteExtra}
                  disabled={saving}
                >
                  <Text style={styles.addButtonText}>Save site question</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={cardStyle}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>
              Merged preview ({mergedPreview.length} questions)
            </Text>
            {siteFilter ? (
              mergedPreview.map((q) => (
                <Text key={q.id} style={{ fontSize: 12, marginBottom: 4 }}>
                  {q.id}
                </Text>
              ))
            ) : (
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Select a site to preview base + site extras.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
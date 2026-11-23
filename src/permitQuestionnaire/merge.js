/**
 * Merge BU base questions with site-only additions into one ordered list.
 */

function compareOrder(a, b) {
  const oa = a._sortOrder ?? 0;
  const ob = b._sortOrder ?? 0;
  if (oa !== ob) return oa - ob;
  return (a.id || '').localeCompare(b.id || '');
}

/**
 * @param {Array} baseQuestions
 * @param {Array<{ question: object, sort_order?: number, insert_after_question_id?: string }>} siteRows
 */
export function mergeQuestions(baseQuestions, siteRows = []) {
  const base = (baseQuestions || []).map((q, index) => ({
    ...q,
    _sortOrder: index,
  }));

  const baseIdIndex = new Map(base.map((q, i) => [q.id, i]));

  const extras = (siteRows || []).map((row) => {
    const q = row.question || row;
    let sortOrder;
    if (row.insert_after_question_id && baseIdIndex.has(row.insert_after_question_id)) {
      sortOrder = baseIdIndex.get(row.insert_after_question_id) + 0.5;
    } else if (row.sort_order != null && !Number.isNaN(Number(row.sort_order))) {
      sortOrder = Number(row.sort_order);
    } else {
      sortOrder = base.length + 1000;
    }
    return { ...q, _sortOrder: sortOrder };
  });

  return [...base, ...extras]
    .sort(compareOrder)
    .map(({ _sortOrder, ...rest }) => rest);
}

/**
 * @param {Record<string, Array>} baseByType
 * @param {Record<string, Array>} siteRowsByType - arrays of site question rows per permit key
 */
export function mergeQuestionnaireMap(baseByType, siteRowsByType) {
  const keys = new Set([
    ...Object.keys(baseByType || {}),
    ...Object.keys(siteRowsByType || {}),
  ]);
  const result = {};
  keys.forEach((key) => {
    result[key] = mergeQuestions(
      baseByType?.[key] || [],
      siteRowsByType?.[key] || [],
    );
  });
  return result;
}
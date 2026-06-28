// PostgREST returns at most 1000 rows per request unless paginated with .range()
export const PAGE_SIZE = 1000;
export const IN_QUERY_BATCH_SIZE = 200;

export const fetchAllPaginated = async (buildQuery) => {
  const allRows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    if (!data?.length) break;

    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
};

export const fetchAllBatchedByIds = async (ids, buildQuery) => {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const allRows = [];
  for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
    const { data, error } = await buildQuery(batch);
    if (error) throw error;
    if (data?.length) {
      allRows.push(...data);
    }
  }

  return allRows;
};

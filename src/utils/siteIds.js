/**
 * Merge site UUID arrays, preserving order and removing duplicates.
 */
export function mergeSiteIds(...arrays) {
  const merged = [];
  const seen = new Set();

  arrays.forEach((value) => {
    (value || []).forEach((siteId) => {
      if (!siteId || seen.has(siteId)) {
        return;
      }
      seen.add(siteId);
      merged.push(siteId);
    });
  });

  return merged;
}

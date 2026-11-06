// Chooses the record that actually holds the client's data when several
// records exist for the same entity (duplicates, re-created rows, empty rows
// created by a save). A record with data always beats an empty one, so real
// data is never hidden behind a blank duplicate.
const IGNORED = new Set([
  'id', 'user_id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample',
]);

function filled(value) {
  if (value === null || value === undefined || value === '' || value === 0) return 0;
  if (Array.isArray(value)) return value.length ? 2 : 0;
  if (typeof value === 'object') return Object.keys(value).length ? 2 : 0;
  return 1;
}

export function recordWeight(record) {
  if (!record) return 0;
  return Object.entries(record).reduce(
    (total, [key, value]) => (IGNORED.has(key) ? total : total + filled(value)),
    0,
  );
}

export function pickBestRecord(records) {
  const list = Array.isArray(records) ? records.filter(Boolean) : [];
  if (list.length <= 1) return list[0] || null;
  return [...list].sort((a, b) => {
    const weight = recordWeight(b) - recordWeight(a);
    if (weight !== 0) return weight;
    return new Date(b.updated_date || 0) - new Date(a.updated_date || 0);
  })[0];
}
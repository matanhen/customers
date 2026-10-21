// Pension records are stored per month. A month that has no record of its own
// inherits the most recent earlier record (or the legacy record saved before
// months existed), so an entered value stays the default for every later month
// until the user changes it.

export const PENSION_GENDERS = ['male', 'female'];
export const PENSION_FUND_TYPES = ['pension', 'keren_hishtalmut', 'kupat_gemel'];

export const PENSION_KEY = (gender, fundType) => `${gender}|${fundType}`;

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const FUND_LABELS = {
  pension: 'פנסיה',
  keren_hishtalmut: 'קרן השתלמות',
  kupat_gemel: 'קופת גמל',
};

// Returns { 'gender|fund_type': record } resolved for the given month.
export function resolvePensionForMonth(records, month) {
  const groups = {};
  (records || []).forEach((r) => {
    if (!r?.gender || !r?.fund_type) return;
    const key = PENSION_KEY(r.gender, r.fund_type);
    (groups[key] ||= []).push(r);
  });

  const resolved = {};
  Object.entries(groups).forEach(([key, list]) => {
    const exact = list.find((r) => r.month === month);
    if (exact) { resolved[key] = exact; return; }

    const earlier = list
      .filter((r) => r.month && r.month < month)
      .sort((a, b) => b.month.localeCompare(a.month))[0];
    if (earlier) { resolved[key] = earlier; return; }

    const legacy = list
      .filter((r) => !r.month)
      .sort((a, b) => new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0))[0];
    if (legacy) { resolved[key] = legacy; return; }

    // Month earlier than anything saved: use the earliest known value so past
    // months show the client's real pension instead of zero.
    const earliest = list
      .slice()
      .sort((a, b) => (a.month || '0000-00').localeCompare(b.month || '0000-00'))[0];
    if (earliest) resolved[key] = earliest;
  });

  return resolved;
}

export function pensionTotalForMonth(records, month) {
  return Object.values(resolvePensionForMonth(records, month))
    .reduce((sum, r) => sum + (Number(r.current_amount) || 0), 0);
}

export function pensionBreakdownForMonth(records, month) {
  return Object.values(resolvePensionForMonth(records, month))
    .map((r) => ({
      label: `${FUND_LABELS[r.fund_type] || r.fund_type} (${r.gender === 'male' ? 'גבר' : 'אישה'})`,
      value: Number(r.current_amount) || 0,
    }))
    .filter((r) => r.value > 0);
}
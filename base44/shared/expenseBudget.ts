import { FIXED_EXPENSE_ITEMS, getItemMonthTotal } from './expenseCategories.ts';

// Shared budget/spending computation for the WhatsApp expense bot, so the
// numbers it reports are the same numbers the app shows.
//
// - A client's financial records can be split across several ids: their app
//   account (User) and their registration record (AllowedUser). The monthly
//   plan is often saved on one of them while the bot records expenses on the
//   other, which used to make the bot report a budget of 0 and only spending.
//   Every lookup therefore covers ALL of the client's ids.
// - The variable budget comes from the MonthlyPlan of the current month. Many
//   clients have no plan for the new month yet (the plan is set for the month
//   that just ended), so we fall back to the most recent earlier month that does
//   have a variable budget.
// - The spend side counts exactly what the app counts: variable items in
//   fixed_expenses (honouring each user's fixed/variable overrides) plus custom
//   variable expenses.

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);
const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase();

// Every id that holds this client's data, in priority order: the app account
// first (the id the bot writes expenses to), then the registration records.
export async function resolveClientIds(base44, user) {
  const ids: string[] = [];
  const add = (id) => {
    if (id && !ids.includes(id)) ids.push(id);
  };

  add(user?.id);
  add(user?.allowed_user_id);

  const email = normalizeEmail(user?.email);
  if (email) {
    try {
      const [users, allowedUsers] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ email }),
        base44.asServiceRole.entities.AllowedUser.filter({ email }),
      ]);
      asArray(users).forEach((r) => add(r?.id));
      asArray(allowedUsers).forEach((r) => add(r?.id));
    } catch { /* account id alone is enough to continue */ }
  }

  return ids;
}

export async function loadFixedOverrides(base44, userId) {
  try {
    const rows = asArray(await base44.asServiceRole.entities.ExpenseFixedOverride.filter({ user_id: userId }));
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      if (row?.item_name) map[row.item_name] = row.is_fixed !== false;
    }
    return map;
  } catch {
    return {};
  }
}

export function isFixedForUser(itemName, overrides = {}) {
  if (overrides[itemName] !== undefined) return overrides[itemName];
  return FIXED_EXPENSE_ITEMS.has(itemName);
}

// This month's tracking record. The account's own record wins (that is where
// the bot writes); another id's record is used only when the account has none
// for the month, so the same expense is never counted twice.
export async function loadTrackingForMonth(base44, userIds, month) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  let fallback = null;
  for (const id of ids) {
    try {
      const record = asArray(await base44.entities.ExpenseTracking.filter({ user_id: id, month }))[0];
      if (!record) continue;
      if (id === ids[0]) return record;
      if (!fallback) fallback = record;
    } catch { /* try the next id */ }
  }
  return fallback;
}

// The variable (discretionary) budget for a month: this month's plan from any of
// the client's records, otherwise the newest earlier plan that carries a real
// budget.
export async function resolvePlannedVariable(base44, userIds, month) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  const plans: any[] = [];

  for (const id of ids) {
    try {
      plans.push(...asArray(await base44.asServiceRole.entities.MonthlyPlan.filter({ user_id: id })));
    } catch { /* try the next id */ }
  }

  const current = plans.filter((p) => p?.month === month && (p.variable_expenses || 0) > 0);
  if (current.length) {
    const preferred = current.find((p) => p.user_id === ids[0]);
    return (preferred || current[0]).variable_expenses;
  }

  const earlier = plans
    .filter((p) => p?.month && p.month < month && (p.variable_expenses || 0) > 0)
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  return earlier[0]?.variable_expenses || 0;
}

// Variable spending of the tracking record: month total + per-week totals.
export function computeVariableSpend(tracking, overrides = {}) {
  const weekly = { week1: 0, week2: 0, week3: 0, week4: 0 };
  let monthSpent = 0;

  for (const [item, entry] of Object.entries(tracking?.fixed_expenses || {})) {
    if (isFixedForUser(item, overrides)) continue;

    if (typeof entry === 'number') {
      // Legacy flat number entry counts as week 1, like the app.
      weekly.week1 += entry;
      monthSpent += entry;
    } else if (entry && typeof entry === 'object') {
      for (const key of ['week1', 'week2', 'week3', 'week4']) {
        const value = (entry as Record<string, number>)[key] || 0;
        weekly[key] += value;
        monthSpent += value;
      }
    }
  }

  for (const exp of tracking?.custom_expenses || []) {
    if (exp?.type === 'variable') monthSpent += exp.amount || 0;
  }

  return { monthSpent, weekly };
}

export { getItemMonthTotal };
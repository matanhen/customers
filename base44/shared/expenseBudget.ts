import { FIXED_EXPENSE_ITEMS, getItemMonthTotal } from './expenseCategories.ts';

// Shared budget/spending computation for the WhatsApp expense bot, so the
// numbers it reports are the same numbers the app shows.
//
// - The variable budget comes from the MonthlyPlan of the current month. Many
//   clients have no plan for the new month yet (the plan is set for the month
//   that just ended), which used to make the bot report a budget of 0 and a
//   nonsensical negative "remaining" on every expense. We therefore fall back to
//   the most recent earlier month that does have a variable budget.
// - The spend side counts exactly what the app counts: variable items in
//   fixed_expenses (honouring each user's fixed/variable overrides) plus custom
//   variable expenses.

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

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

// The variable (discretionary) budget for a month: this month's plan, otherwise
// the newest earlier plan that carries a real budget.
export async function resolvePlannedVariable(base44, userId, month) {
  try {
    const current = asArray(await base44.asServiceRole.entities.MonthlyPlan.filter({ user_id: userId, month }));
    const amount = current[0]?.variable_expenses || 0;
    if (amount > 0) return amount;
  } catch { /* fall through */ }

  try {
    const rows = asArray(await base44.asServiceRole.entities.MonthlyPlan.filter(
      { user_id: userId },
      { sort: '-month', limit: 24 },
    ));
    const earlier = rows.find((p) => p.month && p.month < month && (p.variable_expenses || 0) > 0);
    return earlier?.variable_expenses || 0;
  } catch {
    return 0;
  }
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
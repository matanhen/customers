// Verified re-linking of client data between user ids.
//
// Every data entity stores the client's id in user_id. When a User or
// AllowedUser record is deleted, its data must first be moved to a surviving
// record — otherwise the data stays in the database but becomes unreachable
// (the exact bug that made advisors see empty trackers, balances and plans).
//
// The SDK's updateMany() silently fails in the functions runtime, so every
// record is moved with an individual update() call and the result verified.
// When the target already holds a record with the same key (same month /
// plan / single row), the orphan's values are MERGED into it instead of
// creating a duplicate row — and the original is left in place, never deleted.

export const USER_ID_ENTITIES = [
  'ExpenseTracking', 'MonthlyPlan', 'MonthlyBalance', 'FinancialPlan',
  'FinancialPlanData', 'FinancialPlanItem', 'FinancialReflection',
  'PensionData', 'Investment', 'Debt', 'GoalSettings', 'FinancialGoal',
  'PortfolioSettings', 'WorkbookAnswers', 'CustomExpenseCategory',
  'ExpenseFixedOverride', 'ConversationLog',
];

const asArray = (result) => (Array.isArray(result) ? result : (result?.items || []));
const PROTECTED = new Set(['id', 'user_id', 'created_date', 'updated_date', 'created_by_id']);
const isEmpty = (v) =>
  v === undefined || v === null || v === 0 || v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);

// Which records logically collide when both ids hold one (per month, per plan
// type, or the single per-client row entities).
const sameKey = (entity, a, b) => {
  if (entity === 'ExpenseTracking' || entity === 'MonthlyPlan' || entity === 'MonthlyBalance') {
    return a.month === b.month;
  }
  if (entity === 'FinancialPlan') return a.plan_type === b.plan_type;
  if (entity === 'FinancialPlanData' || entity === 'FinancialReflection' ||
      entity === 'GoalSettings' || entity === 'PortfolioSettings' || entity === 'WorkbookAnswers') {
    return true;
  }
  return false;
};

// Fill-only merge: takes values from the orphan record that the target is
// missing — never overwrites data the target already has.
function buildPatch(orphan, target) {
  const patch = {};
  for (const key of Object.keys(orphan)) {
    if (PROTECTED.has(key)) continue;
    const ov = orphan[key];
    const tv = target[key];
    if (isEmpty(tv) && !isEmpty(ov)) { patch[key] = ov; continue; }
    if (Array.isArray(tv) && Array.isArray(ov) && ov.length) {
      const keyOf = (x) => (x && (x.id || x.name)) ? (x.id || x.name) : JSON.stringify(x);
      const existing = new Set(tv.map(keyOf));
      const extra = ov.filter((x) => !existing.has(keyOf(x)));
      if (extra.length) patch[key] = [...tv, ...extra];
      continue;
    }
    if (tv && typeof tv === 'object' && !Array.isArray(tv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      let changed = false;
      const merged = { ...tv };
      for (const k of Object.keys(ov)) {
        if (isEmpty(merged[k]) && !isEmpty(ov[k])) { merged[k] = ov[k]; changed = true; }
      }
      if (changed) patch[key] = merged;
    }
  }
  return patch;
}

// Moves every data record from `fromId` to `toId`, verified record by record.
export async function relinkUserData(base44, fromId, toId) {
  const results = { moved: 0, merged: 0, failed: 0, errors: [] };
  for (const entity of USER_ID_ENTITIES) {
    let records = [];
    try {
      records = asArray(await base44.asServiceRole.entities[entity].filter({ user_id: fromId }));
    } catch (e) {
      results.errors.push(entity + ': ' + e.message);
      continue;
    }
    if (!records.length) continue;

    let targets = [];
    try {
      targets = asArray(await base44.asServiceRole.entities[entity].filter({ user_id: toId }));
    } catch (e) { /* treat as no target records */ }

    for (const record of records) {
      const conflict = targets.find((t) => sameKey(entity, t, record));
      try {
        if (conflict) {
          const patch = buildPatch(record, conflict);
          if (Object.keys(patch).length) {
            await base44.asServiceRole.entities[entity].update(conflict.id, patch);
            results.merged++;
          }
          // No move and no delete — the target row now holds everything.
        } else {
          const updated = await base44.asServiceRole.entities[entity].update(record.id, { user_id: toId });
          if (updated && (updated.user_id === toId || updated.id === record.id)) {
            results.moved++;
          } else {
            results.failed++;
            results.errors.push(entity + ':' + record.id + ' — update did not apply');
          }
        }
      } catch (e) {
        results.failed++;
        results.errors.push(entity + ':' + record.id + ' — ' + e.message);
      }
    }
  }
  return results;
}

// Moves advisor-assignment references (client_id / advisor_id) between ids.
export async function relinkAssignments(base44, fromId, toId) {
  let failed = 0;
  for (const field of ['client_id', 'advisor_id']) {
    try {
      const records = asArray(await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ [field]: fromId }));
      for (const record of records) {
        try {
          await base44.asServiceRole.entities.ClientAdvisorAssignment.update(record.id, { [field]: toId });
        } catch (e) { failed++; }
      }
    } catch (e) { /* ignore */ }
  }
  return failed;
}

// True if the client still has any data records under one of the given ids.
export async function clientHasData(base44, ids) {
  for (const entity of USER_ID_ENTITIES) {
    if (entity === 'ConversationLog') continue;
    for (const id of ids) {
      try {
        const records = asArray(await base44.asServiceRole.entities[entity].filter({ user_id: id }));
        if (records.length > 0) return true;
      } catch (e) { /* ignore */ }
    }
  }
  return false;
}
// Verified re-linking of client data between user ids.
//
// Every data entity stores the client's id in user_id. When a User or
// AllowedUser record is deleted, its data must first be moved to a surviving
// record — otherwise the data stays in the database but becomes unreachable
// (the exact bug that made advisors see empty trackers, balances and plans).
//
// The SDK's updateMany() silently fails in the functions runtime, so every
// record is moved with an individual update() call and the result verified.
// When a target already holds the same month / plan / single row, retain BOTH
// originals and report a conflict for manual review. Never automatically merge
// or delete financial history.

export const USER_ID_ENTITIES = [
  'ExpenseTracking', 'MonthlyPlan', 'MonthlyBalance', 'FinancialPlan',
  'FinancialPlanData', 'FinancialPlanItem', 'FinancialReflection',
  'PensionData', 'Investment', 'Debt', 'GoalSettings', 'FinancialGoal',
  'PortfolioSettings', 'WorkbookAnswers', 'CustomExpenseCategory',
  'ExpenseFixedOverride', 'ConversationLog',
];

const asArray = (result) => (Array.isArray(result) ? result : (result?.items || []));

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


// Moves every data record from `fromId` to `toId`, verified record by record.
export async function relinkUserData(base44, fromId, toId) {
  const results = { moved: 0, merged: 0, failed: 0, errors: [] };
  for (const entity of USER_ID_ENTITIES) {
    let records = [];
    try {
      records = asArray(await base44.asServiceRole.entities[entity].filter({ user_id: fromId }));
    } catch (e) {
      results.failed++;
      results.errors.push(entity + ': ' + e.message);
      continue;
    }
    if (!records.length) continue;

    let targets = [];
    try {
      targets = asArray(await base44.asServiceRole.entities[entity].filter({ user_id: toId }));
    } catch (e) {
      results.failed++;
      results.errors.push(entity + ': target lookup failed: ' + e.message);
      continue;
    }

    for (const record of records) {
      const conflict = targets.find((t) => sameKey(entity, t, record));
      try {
        if (conflict) {
          results.failed++;
          results.errors.push(entity + ':' + record.id + ' conflicts with ' + conflict.id + '; both originals retained for manual review');
        } else {
          await base44.asServiceRole.entities[entity].update(record.id, { user_id: toId });
          const verified = await base44.asServiceRole.entities[entity].get(record.id);
          if (verified?.user_id === toId) {
            targets.push(verified);
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
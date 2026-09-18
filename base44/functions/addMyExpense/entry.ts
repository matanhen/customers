import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isVariableItem, getCurrentMonth, getCurrentFinWeek } from '../../shared/expenseCategories.ts';

// Adds an expense to the current client's monthly tracking record.
// Called by the WhatsApp expense agent. Identifies the client via base44.auth.me().
//
// IMPORTANT: the app stores ALL expenses (fixed + variable) in `fixed_expenses` as a
// flat { [item]: monthTotalNumber } map. Variable items are identified by isVariableItem().
// We must match that structure so the app's totals and weekly tracker reflect the expense.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const amount = parseFloat(body.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      return Response.json({ error: 'נדרש סכום חיובי' }, { status: 400 });
    }
    const itemName = (body.item_name || body.item || '').toString().trim();
    if (!itemName) {
      return Response.json({ error: 'נדרש שם סעיף הוצאה' }, { status: 400 });
    }

    const month = getCurrentMonth();
    const week = getCurrentFinWeek();
    const variable = body.expense_type ? body.expense_type === 'variable' : isVariableItem(itemName);

    // Find or create the ExpenseTracking record for this month (calendar month key)
    const records = await base44.entities.ExpenseTracking.filter({ user_id: user.id, month });
    let tracking = records[0];

    if (!tracking) {
      tracking = await base44.entities.ExpenseTracking.create({
        user_id: user.id,
        month,
        actual_income: 0,
        fixed_expenses: {},
        variable_expenses: {},
        custom_expenses: [],
        credit_payments: [],
        freedom_transfer_done: false,
        weekly_snapshots: {},
      });
    }

    // Accumulate the amount onto the item's month total in fixed_expenses (flat map),
    // matching the app's data model.
    const fixedExpenses = { ...(tracking.fixed_expenses || {}) };
    fixedExpenses[itemName] = (fixedExpenses[itemName] || 0) + amount;

    await base44.entities.ExpenseTracking.update(tracking.id, { fixed_expenses: fixedExpenses });
    const updated = await base44.entities.ExpenseTracking.get(tracking.id);

    // Compute current variable spend (matches the app's actualVariableSpent logic)
    let variableSpent = 0;
    for (const [item, val] of Object.entries(updated.fixed_expenses || {})) {
      if (isVariableItem(item)) variableSpent += (val || 0);
    }

    return Response.json({
      success: true,
      month,
      week,
      item: itemName,
      amount,
      variable,
      variableSpent: Math.round(variableSpent),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
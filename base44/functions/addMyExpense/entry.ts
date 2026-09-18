import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  findCategoryKey,
  isVariableItem,
  getCurrentFinWeek,
  getCurrentMonth,
  addAmountToWeek,
  sumVariableExpenses,
} from '../../shared/expenseCategories.ts';

// Adds an expense to the current client's monthly/weekly tracking record.
// Called by the WhatsApp expense agent. Identifies the client via base44.auth.me().
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
    const catKey = body.category_key || findCategoryKey(itemName);
    const variable = body.expense_type
      ? body.expense_type === 'variable'
      : isVariableItem(itemName);

    // Find or create the ExpenseTracking record for this month
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

    const field = variable ? 'variable_expenses' : 'fixed_expenses';
    const expenses = { ...(tracking[field] || {}) };
    const catData = { ...(expenses[catKey] || {}) };
    catData[itemName] = addAmountToWeek(catData[itemName], week, amount);
    expenses[catKey] = catData;

    await base44.entities.ExpenseTracking.update(tracking.id, { [field]: expenses });
    const updated = await base44.entities.ExpenseTracking.get(tracking.id);

    const variableSpent = sumVariableExpenses(updated.variable_expenses || {});

    return Response.json({
      success: true,
      month,
      week,
      item: itemName,
      category: catKey,
      amount,
      variable,
      variableSpent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
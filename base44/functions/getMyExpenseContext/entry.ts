import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  EXPENSE_CATEGORIES,
  getCurrentFinWeek,
  getCurrentMonth,
  isVariableItem,
} from '../../shared/expenseCategories.ts';

// Returns the current client's financial context so the WhatsApp expense agent
// can identify the user and know their categories, budget, and current spending.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const month = getCurrentMonth();
    const week = getCurrentFinWeek();

    // This month's ExpenseTracking record (calendar month key, matches ExpenseTracking.jsx)
    const records = await base44.entities.ExpenseTracking.filter({ user_id: user.id, month });
    const tracking = records[0] || null;

    // Custom expense categories the user defined
    let customCategories = [];
    try {
      customCategories = await base44.entities.CustomExpenseCategory.filter({ user_id: user.id });
    } catch (e) { /* non-critical */ }

    // Monthly plan for the planned variable budget
    let plannedVariable = 0;
    try {
      const plans = await base44.entities.MonthlyPlan.filter({ user_id: user.id, month });
      if (plans[0]) plannedVariable = plans[0].variable_expenses || 0;
    } catch (e) { /* non-critical */ }

    // Variable spend = sum of variable items in fixed_expenses (matches the app's logic)
    let variableSpent = 0;
    for (const [item, val] of Object.entries(tracking?.fixed_expenses || {})) {
      if (isVariableItem(item)) variableSpent += (val || 0);
    }

    return Response.json({
      user: { id: user.id, full_name: user.full_name, email: user.email },
      month,
      week,
      tracking: tracking ? {
        id: tracking.id,
        actual_income: tracking.actual_income || 0,
        variableSpent: Math.round(variableSpent),
      } : null,
      plannedVariable,
      variableSpent: Math.round(variableSpent),
      categories: EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, items: c.items })),
      customCategories: customCategories.map((c) => ({ name: c.name, expense_type: c.expense_type })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
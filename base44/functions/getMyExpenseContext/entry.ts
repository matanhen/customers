import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  EXPENSE_CATEGORIES,
  getCurrentFinWeek,
  getCurrentMonth,
} from '../../shared/expenseCategories.ts';
import { identifyUser } from '../../shared/userIdentification.ts';
import { resolveClientIds, resolvePlannedVariable, loadFixedOverrides, computeVariableSpend, loadTrackingForMonth } from '../../shared/expenseBudget.ts';

// Returns the current client's financial context so the WhatsApp expense agent
// can identify the user and know their categories, budget, and current spending.
// The numbers use the same computation as the app and addMyExpense, so the bot
// never reports a different balance than the one the client sees.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await identifyUser(base44, body);
    if (!user) return Response.json({ error: 'משתמש לא זוהה. אנא שלח קוד אישי.' }, { status: 401 });

    // Use the app account id when available; otherwise the AllowedUser id, so a
    // client that hasn't logged in yet still sees their recorded expenses.
    const effectiveUserId = user.id || user.allowed_user_id;
    if (!effectiveUserId) return Response.json({ error: 'משתמש לא זוהה. אנא שלח קוד אישי.' }, { status: 401 });

    const month = getCurrentMonth();
    const week = getCurrentFinWeek(new Date(), user.cycle_start_day || 10);

    // Every id that holds this client's data (app account + registration records),
    // so a plan saved on one record and expenses on another are both found.
    const clientIds = await resolveClientIds(base44, user);
    if (!clientIds.length) clientIds.push(effectiveUserId);

    // This month's ExpenseTracking record (calendar month key, matches ExpenseTracking.jsx)
    const tracking = await loadTrackingForMonth(base44, clientIds, month);

    // Custom expense categories the user defined
    let customCategories = [];
    try {
      customCategories = await base44.entities.CustomExpenseCategory.filter({ user_id: effectiveUserId });
    } catch (e) { /* non-critical */ }

    // Planned variable budget — this month, or the most recent earlier month
    const plannedVariable = await resolvePlannedVariable(base44, clientIds, month);

    // Variable spend, identical to the app and to addMyExpense
    const overrides = await loadFixedOverrides(base44, effectiveUserId);
    const { monthSpent: variableSpent, weekly } = computeVariableSpend(tracking, overrides);

    const weekSpent = weekly[`week${week}`] || 0;
    const weekBudget = plannedVariable / 4;

    return Response.json({
      user: {
        id: user.id || '',
        full_name: user.full_name,
        email: user.email,
        personal_code: user.personal_code || '',
      },
      month,
      week,
      tracking: tracking ? {
        id: tracking.id,
        actual_income: tracking.actual_income || 0,
        variableSpent: Math.round(variableSpent),
      } : null,
      plannedVariable,
      budgetKnown: plannedVariable > 0,
      variableSpent: Math.round(variableSpent),
      remaining: Math.round(plannedVariable - variableSpent),
      weekBudget: Math.round(weekBudget),
      weekSpent: Math.round(weekSpent),
      weekRemaining: Math.round(weekBudget - weekSpent),
      categories: EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label, items: c.items })),
      customCategories: customCategories.map((c) => ({ name: c.name, expense_type: c.expense_type })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
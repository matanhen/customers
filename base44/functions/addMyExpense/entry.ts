import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  isVariableItem,
  getCurrentMonth,
  getCurrentFinWeek,
  addAmountToWeek,
  getItemMonthTotal,
  findCategoryKey,
  EXPENSE_CATEGORIES,
} from '../../shared/expenseCategories.ts';
import { identifyUser } from '../../shared/userIdentification.ts';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// Adds an expense to the current client's monthly tracking record.
// Called by the WhatsApp expense agent. Identifies the client via personal_code.
//
// IMPORTANT: the app stores ALL expenses (fixed + variable) in `fixed_expenses`.
// Each entry can be a flat number (month total) OR a week object { week1..week4 }.
// We store a week object so the expense appears in the correct financial week,
// and the app's getItemMonthTotal() handles both shapes for totals.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await identifyUser(base44, body);
    if (!user) return Response.json({ error: 'משתמש לא זוהה. אנא שלח קוד אישי.' }, { status: 401 });

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
    const categoryKey = findCategoryKey(itemName);
    const categoryLabel = EXPENSE_CATEGORIES.find(c => c.key === categoryKey)?.label || 'שונות';

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

    // Store the expense in the correct financial week. addAmountToWeek converts a
    // legacy plain number into a week object and adds the amount to the right week.
    const fixedExpenses = { ...(tracking.fixed_expenses || {}) };
    fixedExpenses[itemName] = addAmountToWeek(fixedExpenses[itemName], week, amount);

    await base44.entities.ExpenseTracking.update(tracking.id, { fixed_expenses: fixedExpenses });
    const updated = await base44.entities.ExpenseTracking.get(tracking.id);

    // Compute current variable spend (matches the app's actualVariableSpent logic)
    let variableSpent = 0;
    for (const [item, val] of Object.entries(updated.fixed_expenses || {})) {
      if (isVariableItem(item)) variableSpent += getItemMonthTotal(val);
    }

    // Look up the monthly plan to get the variable expenses budget for this month
    let variableBudget = 0;
    try {
      const plans = await base44.entities.MonthlyPlan.filter({ user_id: user.id, month });
      if (plans.length > 0) {
        variableBudget = plans[0].variable_expenses || 0;
      }
    } catch (e) { /* non-critical */ }

    const remaining = variableBudget - variableSpent;

    // Build a formatted confirmation message with week and month in Hebrew
    const [year, monthNum] = month.split('-');
    const hebrewMonth = HEBREW_MONTHS[parseInt(monthNum) - 1] || '';
    const budgetLines = variableBudget > 0
      ? `מתוך ${variableBudget.toLocaleString('he-IL')}₪\n` +
        `נותר לך לבזבז החודש עוד: ${Math.round(remaining).toLocaleString('he-IL')}₪\n\n`
      : `\n`;
    const confirmationMessage =
      `הוצאה נרשמה ✅\n` +
      `שבוע ${week}, חודש ${hebrewMonth} ${year}.\n\n` +
      `📋 **${itemName}** - ${amount} ₪\n` +
      `📂 סעיף: ${categoryLabel}\n\n` +
      `**סה"כ הוצאות משתנות החודש:** ${Math.round(variableSpent)} ₪\n` +
      budgetLines +
      `משהו נוסף? 😊`;

    return Response.json({
      success: true,
      month,
      week,
      item: itemName,
      amount,
      variable,
      category: categoryKey,
      category_label: categoryLabel,
      variableSpent: Math.round(variableSpent),
      variableBudget,
      remaining: Math.round(remaining),
      confirmation_message: confirmationMessage,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
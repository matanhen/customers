import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  EXPENSE_CATEGORIES,
  isVariableItem,
  getCurrentMonth,
  getCurrentFinWeek,
  addAmountToWeek,
  getItemMonthTotal,
  findCategoryKey,
} from '../../shared/expenseCategories.ts';

// External endpoint for another app to add an expense to a specific client's
// monthly tracking. Authenticates via Bearer token (EXTERNAL_EXPENSE_TOKEN).
//
// Supports two modes:
// 1. Structured: { client_email, item_name, amount } — no LLM needed
// 2. Free text:   { client_email, description: "קפה 15" } — LLM extracts item + amount
//
// Returns: { success, client_email, client_name, month, week, item, category, amount, variable, variableSpent }
export default async function(req) {
  try {
    // --- Auth ---
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const expectedToken = secrets.get('EXTERNAL_EXPENSE_TOKEN');
    if (!expectedToken || token !== expectedToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const clientEmail = (body.client_email || '').toString().toLowerCase().trim();
    if (!clientEmail) {
      return Response.json({ error: 'נדרש client_email' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // --- Find client by email ---
    const users = await base44.asServiceRole.entities.User.filter({ email: clientEmail });
    if (!users.length) {
      return Response.json({ error: 'לקוח לא נמצא במערכת' }, { status: 404 });
    }
    const clientUser = users[0];
    const userId = clientUser.id;

    // --- Parse expense ---
    let amount = parseFloat(body.amount);
    let itemName = (body.item_name || '').toString().trim();

    // If structured data is incomplete but a description is provided, use LLM to extract
    if ((!itemName || !amount || isNaN(amount)) && body.description) {
      const categoryList = EXPENSE_CATEGORIES.map(c => `${c.label}: ${c.items.join(', ')}`).join('\n');
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `הלקוח שלח הודעת הוצאה: "${body.description}"\n` +
          `חלץ את שם הסעיף והסכום. התאם את שם הסעיף לרשימה הבאה (בחר את הסעיף הקרוב ביותר, החזר את השם המדויק מהרשימה):\n${categoryList}\n` +
          `החזר JSON בלבד.`,
        response_json_schema: {
          type: 'object',
          properties: {
            item_name: { type: 'string' },
            amount: { type: 'number' },
          },
        },
      });
      itemName = itemName || (llmRes.item_name || '').toString().trim();
      if (!amount || isNaN(amount)) amount = parseFloat(llmRes.amount);
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return Response.json({ error: 'נדרש סכום חיובי' }, { status: 400 });
    }
    if (!itemName) {
      return Response.json({ error: 'נדרש שם סעיף הוצאה (item_name או description)' }, { status: 400 });
    }

    // --- Add to tracking ---
    const month = getCurrentMonth();
    const week = getCurrentFinWeek();
    const categoryKey = findCategoryKey(itemName);
    const variable = isVariableItem(itemName);

    const records = await base44.asServiceRole.entities.ExpenseTracking.filter({ user_id: userId, month });
    let tracking = records[0];

    if (!tracking) {
      tracking = await base44.asServiceRole.entities.ExpenseTracking.create({
        user_id: userId,
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

    const fixedExpenses = { ...(tracking.fixed_expenses || {}) };
    fixedExpenses[itemName] = addAmountToWeek(fixedExpenses[itemName], week, amount);
    await base44.asServiceRole.entities.ExpenseTracking.update(tracking.id, { fixed_expenses: fixedExpenses });

    // --- Compute variable spend for response ---
    let variableSpent = 0;
    for (const [item, val] of Object.entries(fixedExpenses)) {
      if (isVariableItem(item)) variableSpent += getItemMonthTotal(val);
    }

    return Response.json({
      success: true,
      client_email: clientEmail,
      client_name: clientUser.full_name || '',
      month,
      week,
      item: itemName,
      category: categoryKey,
      amount,
      variable,
      variableSpent: Math.round(variableSpent),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WEBHOOK_URL = 'https://hook.eu2.make.com/v5qurfu32a27dc8lhefhvkr9xjbdm5fy';

// Financial weeks run 10th-to-16th / 17th-23rd / 24th-end / 1st-9th (next month)
function getCurrentWeekNumber(day) {
  if (day >= 10 && day <= 16) return 1;
  if (day >= 17 && day <= 23) return 2;
  if (day >= 24) return 3;
  return 4;
}

function formatDateTime(iso) {
  if (!iso) return null;
  return String(iso).slice(0, 19);
}

function getItemWeekAmount(entry, week) {
  if (entry == null) return 0;
  if (typeof entry === 'number') return week === 1 ? entry : 0;
  return entry[`week${week}`] || 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const testEmail = body.test_email || null;

    // Current date/time in Israel timezone
    const nowStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const [year, month, day] = nowStr.split('-');
    const currentMonth = `${year}-${month}`;
    const currentWeekNumber = getCurrentWeekNumber(parseInt(day));

    let clients = await base44.asServiceRole.entities.User.filter({ user_type: 'client' });
    if (testEmail) {
      clients = clients.filter(c => (c.email || '').toLowerCase() === testEmail.toLowerCase());
    }

    const workbookContents = await base44.asServiceRole.entities.WorkbookContent.list();
    const totalQuestions = workbookContents.reduce((sum, section) => sum + ((section.questions || []).length), 0);

    // Fetch all needed data in bulk (a handful of calls total) instead of per-client queries,
    // to avoid hitting entity API rate limits when there are many clients.
    const [allAnswers, allAssignments, allPlans, allTrackings, allBalances] = await Promise.all([
      base44.asServiceRole.entities.WorkbookAnswers.list(),
      base44.asServiceRole.entities.ClientAdvisorAssignment.list(),
      base44.asServiceRole.entities.MonthlyPlan.filter({ month: currentMonth }),
      base44.asServiceRole.entities.ExpenseTracking.filter({ month: currentMonth }),
      base44.asServiceRole.entities.MonthlyBalance.filter({ month: currentMonth }),
    ]);

    const answersByUserId = {};
    allAnswers.forEach(a => { if (a.user_id) answersByUserId[a.user_id] = a; });
    const assignmentByEmail = {};
    allAssignments.forEach(a => { if (a.client_email) assignmentByEmail[a.client_email.toLowerCase()] = a; });
    const planByUserId = {};
    allPlans.forEach(p => { if (p.user_id) planByUserId[p.user_id] = p; });
    const trackingByUserId = {};
    allTrackings.forEach(t => { if (t.user_id) trackingByUserId[t.user_id] = t; });
    const balanceByUserId = {};
    allBalances.forEach(b => { if (b.user_id) balanceByUserId[b.user_id] = b; });

    const results = [];

    for (const client of clients) {
      const answersRecord = answersByUserId[client.id];
      const answers = answersRecord?.answers || {};
      const answeredCount = Object.values(answers).filter(v => v !== undefined && v !== null && v !== '').length;

      const assignment = assignmentByEmail[(client.email || '').toLowerCase()] || {};
      const plan = planByUserId[client.id] || {};
      const tracking = trackingByUserId[client.id] || {};
      const balance = balanceByUserId[client.id] || {};

      const totalAssets = (balance.assets?.items || []).reduce((s, item) => s + (item.value || 0), 0);
      const totalLiabilities = (balance.liabilities?.items || []).reduce((s, item) => s + (item.balance || 0), 0);
      const netWorth = totalAssets - totalLiabilities;

      const plannedVariable = plan.variable_expenses || 0;
      const weeklyBudgetTotal = plannedVariable / 4;

      const categoryExpenses = tracking._categoryExpenses || {};
      let weeklyExpensesTotal = 0;
      Object.values(categoryExpenses).forEach((items) => {
        Object.values(items || {}).forEach((entry) => {
          weeklyExpensesTotal += getItemWeekAmount(entry, currentWeekNumber);
        });
      });

      const payload = {
        email: client.email,
        workbook_total_questions: totalQuestions,
        workbook_answered_questions: answeredCount,
        first_login_date: formatDateTime(assignment.first_login_date),
        last_login_date: formatDateTime(assignment.last_login_date),
        planned_income: plan.expected_income || 0,
        planned_savings: plan.savings || 0,
        planned_fixed_expenses: plan.fixed_expenses || 0,
        planned_variable_expenses: plannedVariable,
        weekly_budget_total: Math.round(weeklyBudgetTotal),
        weekly_expenses_total: Math.round(weeklyExpensesTotal),
        current_week_number: currentWeekNumber,
        total_assets: Math.round(totalAssets),
        total_liabilities: Math.round(totalLiabilities),
        net_worth: Math.round(netWorth),
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      results.push({ email: client.email, sent: res.ok, status: res.status });
    }

    return Response.json({ success: true, total_clients: clients.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
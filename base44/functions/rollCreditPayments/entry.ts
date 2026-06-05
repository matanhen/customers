import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Called monthly to roll over credit installment payments to the next month
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all expense tracking records
    const allTracking = await base44.asServiceRole.entities.ExpenseTracking.list('-created_date', 500);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonth = (() => {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    let processed = 0;

    for (const record of allTracking) {
      const payments = record.credit_payments || [];
      if (!payments.length) continue;

      // Find payments that are active (remaining installments > 0)
      const activePayments = payments.filter(p => {
        const remaining = (p.total_installments || 1) - (p.paid_installments || 0);
        return remaining > 0;
      });

      if (!activePayments.length) continue;

      // Find or create next month record for this user
      const nextMonthRecords = await base44.asServiceRole.entities.ExpenseTracking.filter({
        user_id: record.user_id,
        month: nextMonth
      });

      const nextRecord = nextMonthRecords[0];
      const rolledPayments = activePayments.map(p => ({
        ...p,
        paid_installments: (p.paid_installments || 0) + 1,
      })).filter(p => {
        const remaining = (p.total_installments || 1) - (p.paid_installments || 0);
        return remaining > 0; // only carry over if still remaining
      });

      if (rolledPayments.length === 0) continue;

      if (nextRecord) {
        const existingPayments = nextRecord.credit_payments || [];
        // Merge: don't duplicate
        const existingIds = new Set(existingPayments.map(p => p.id));
        const newPayments = [...existingPayments, ...rolledPayments.filter(p => !existingIds.has(p.id))];
        await base44.asServiceRole.entities.ExpenseTracking.update(nextRecord.id, {
          credit_payments: newPayments
        });
      } else {
        await base44.asServiceRole.entities.ExpenseTracking.create({
          user_id: record.user_id,
          month: nextMonth,
          actual_income: 0,
          fixed_expenses: {},
          variable_expenses: {},
          custom_expenses: [],
          credit_payments: rolledPayments,
          freedom_transfer_done: false,
        });
      }
      processed++;
    }

    return Response.json({ success: true, processed, currentMonth, nextMonth });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
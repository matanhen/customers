import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { FIXED_EXPENSE_ITEMS, getItemMonthTotal } from '../../shared/expenseCategories.ts';

// Copies FIXED expenses forward into every following month of the monthly
// tracking, for all users.
//
// For each user, the months are walked in chronological order: the most recent
// month that recorded a real (non-zero) amount for a fixed item is carried into
// every later month where that item is missing or empty. A month that already
// holds its own amount is never touched, so a change the user made stays.
//
// Admin only (or a server/service call). Supports dry_run.
const LIST_LIMIT = 5000;

const asArray = (result) => (Array.isArray(result) ? result : (result?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;

    const caller = await base44.auth.me().catch(() => null);
    const isAdmin = caller?.role === 'admin' || caller?.user_type === 'admin';
    if (caller && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [recordsRaw, overridesRaw] = await Promise.all([
      base44.asServiceRole.entities.ExpenseTracking.list('-month', LIST_LIMIT),
      base44.asServiceRole.entities.ExpenseFixedOverride.list('-created_date', LIST_LIMIT),
    ]);
    const records = asArray(recordsRaw);
    const overrides = asArray(overridesRaw);

    // user_id -> { itemName: isFixed } (the user's own fixed/variable choices)
    const overridesByUser = {};
    overrides.forEach((o) => {
      if (!o?.user_id || !o?.item_name) return;
      if (!overridesByUser[o.user_id]) overridesByUser[o.user_id] = {};
      overridesByUser[o.user_id][o.item_name] = !!o.is_fixed;
    });

    const isFixedFor = (userId, item) => {
      const own = overridesByUser[userId] || {};
      if (own[item] !== undefined) return own[item];
      return FIXED_EXPENSE_ITEMS.has(item);
    };

    const byUser = {};
    records.forEach((r) => {
      if (!r?.user_id || !r?.month) return;
      if (!byUser[r.user_id]) byUser[r.user_id] = [];
      byUser[r.user_id].push(r);
    });

    const updates = [];
    Object.entries(byUser).forEach(([userId, list]) => {
      const months = [...list].sort((a, b) => String(a.month).localeCompare(String(b.month)));
      const active = {}; // item -> most recent real monthly amount

      months.forEach((record) => {
        const saved = record.fixed_expenses || {};
        const next = { ...saved };
        let changed = false;

        // Carry the known fixed amounts into this month where it has none.
        Object.entries(active).forEach(([item, total]) => {
          if (getItemMonthTotal(next[item]) > 0) return;
          next[item] = total;
          changed = true;
        });

        // This month's own amounts become the value carried onwards.
        Object.entries(saved).forEach(([item, entry]) => {
          if (!isFixedFor(userId, item)) return;
          const total = getItemMonthTotal(entry);
          if (total > 0) active[item] = total;
        });

        if (changed) updates.push({ id: record.id, fixed_expenses: next });
      });
    });

    if (dryRun) {
      return Response.json({
        dry_run: true,
        records: records.length,
        users: Object.keys(byUser).length,
        updates: updates.length,
        sample: updates.slice(0, 5).map((u) => u.id),
      });
    }

    let updated = 0;
    const errors = [];
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      await Promise.all(batch.map((u) => base44.asServiceRole.entities.ExpenseTracking
        .update(u.id, { fixed_expenses: u.fixed_expenses })
        .then(() => { updated++; })
        .catch((e) => { errors.push(`${u.id}: ${e?.message || e}`); })));
    }

    return Response.json({
      success: errors.length === 0,
      records: records.length,
      users: Object.keys(byUser).length,
      updated,
      failed: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
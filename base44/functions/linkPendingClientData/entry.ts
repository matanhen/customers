import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { normalizeEmail } from '../../shared/userIdentification.ts';
import { relinkUserData, relinkAssignments } from '../../shared/relinkUserData.ts';

// Moves ALL of a client's data — expenses, balance, monthly plans, pension,
// reflections, workbook, goals… — from their registration record (AllowedUser,
// used by the WhatsApp bot before they ever logged in) to their app account.
// Runs on every login; idempotent, and a no-op when there is nothing to move.
//
// Rows that collide (same month / same single-row entity) are merged fill-only
// and the duplicate is removed, so nothing is lost and no duplicate row hides
// the real data in the app.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json().catch(() => ({}));
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return Response.json({ error: 'נדרש email' }, { status: 400 });

    // The client's app account
    const user = (await base44.asServiceRole.entities.User.filter({ email: normalizedEmail }))[0];
    if (!user?.id) return Response.json({ success: true, migrated: 0, reason: 'no_app_account_yet' });

    // All registration records for this email (there can be duplicates from the
    // external registration webhook)
    const allowedRecords = await base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail });
    const allowedIds = (allowedRecords || [])
      .map(a => a.id)
      .filter(id => id && id !== user.id);
    if (allowedIds.length === 0) return Response.json({ success: true, migrated: 0, reason: 'no_allowed_records' });

    const totals = { moved: 0, merged: 0, failed: 0 };
    for (const id of allowedIds) {
      const result = await relinkUserData(base44, id, user.id);
      totals.moved += result.moved;
      totals.merged += result.merged;
      totals.failed += result.failed;
      await relinkAssignments(base44, id, user.id);
    }

    return Response.json({
      success: true,
      migrated: totals.moved + totals.merged,
      ...totals,
      user_id: user.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
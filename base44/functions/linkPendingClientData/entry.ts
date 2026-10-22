import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeEmail } from '../../shared/userIdentification.ts';

// Re-links expense-tracking records that were stored against a client's
// AllowedUser id (because they used the WhatsApp bot before logging in) to the
// client's app User id, the first time they log in. Idempotent — safe to call
// on every login; a no-op when there is nothing to migrate.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json().catch(() => ({}));
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return Response.json({ error: 'נדרש email' }, { status: 400 });

    // The client's app account
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const user = users[0];
    if (!user?.id) return Response.json({ success: true, migrated: 0, reason: 'no_app_account_yet' });

    // All AllowedUser records for this email (there can be duplicates from the
    // external registration webhook)
    const allowedRecords = await base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail });
    const allowedIds = (allowedRecords || []).map(a => a.id).filter(Boolean);
    if (allowedIds.length === 0) return Response.json({ success: true, migrated: 0, reason: 'no_allowed_records' });

    // ExpenseTracking records stored under any of those AllowedUser ids
    const pending = await base44.asServiceRole.entities.ExpenseTracking.filter({ user_id: { $in: allowedIds } });
    let migrated = 0;
    for (const rec of pending) {
      if (rec.user_id === user.id) continue;
      await base44.asServiceRole.entities.ExpenseTracking.update(rec.id, { user_id: user.id });
      migrated++;
    }

    return Response.json({ success: true, migrated, user_id: user.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
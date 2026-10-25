import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

// Read every AllowedUser record, following pagination cursors.
async function listAllAllowed(base44) {
  const byId = new Map();
  let cursor = null;
  for (let i = 0; i < 100; i++) {
    const page = await base44.asServiceRole.entities.AllowedUser.list(cursor ? { limit: 200, cursor } : { limit: 200 });
    for (const item of asArray(page)) byId.set(item.id, item);
    const next = !Array.isArray(page) ? page?.next_cursor : null;
    if (next) { cursor = next; continue; }
    break;
  }
  return [...byId.values()];
}

// Merges duplicate AllowedUser records that share the same email into one.
// Keeps the richest record (preferring the personal code that is also on the
// linked app user), transfers any expense/assignment references, then deletes
// the extra records. Idempotent — admin only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || (caller.role !== 'admin' && caller.user_type !== 'admin')) {
      return Response.json({ error: 'אין הרשאה - נדרש מנהל מערכת' }, { status: 403 });
    }

    const allAllowed = await listAllAllowed(base44);

    const groups = new Map();
    for (const a of allAllowed) {
      const email = (a.email || '').toLowerCase().trim();
      if (!email) continue;
      if (!groups.has(email)) groups.set(email, []);
      groups.get(email).push(a);
    }

    let merged = 0;
    const details = [];

    for (const [email, records] of groups) {
      if (records.length <= 1) continue;

      // The code on the app user record (if any) is the "official" one.
      const linkedUser = asArray(await base44.asServiceRole.entities.User.filter({ email }))[0] || null;
      const officialCode = (linkedUser?.personal_code || '').toUpperCase().trim();

      // Choose the keeper: matching official code > has a code > most filled > oldest
      const score = (r) => {
        let s = 0;
        if (officialCode && (r.personal_code || '').toUpperCase().trim() === officialCode) s += 1000;
        if (r.personal_code) s += 100;
        if (r.full_name) s += 10;
        if (r.phone) s += 5;
        return s;
      };
      records.sort((a, b) => score(b) - score(a) || new Date(a.created_date || 0) - new Date(b.created_date || 0));
      const keep = records[0];
      const duplicates = records.slice(1);

      // Fill any empty fields on the keeper from the duplicates
      const patch: Record<string, any> = {};
      if (!keep.full_name) { const d = duplicates.find(x => x.full_name); if (d) patch.full_name = d.full_name; }
      if (!keep.phone) { const d = duplicates.find(x => x.phone); if (d) patch.phone = d.phone; }
      if (!keep.personal_code) { const d = duplicates.find(x => x.personal_code); if (d) patch.personal_code = d.personal_code; }
      if (!keep.user_type) { const d = duplicates.find(x => x.user_type); if (d) patch.user_type = d.user_type; }
      if (Object.keys(patch).length) {
        try { await base44.asServiceRole.entities.AllowedUser.update(keep.id, patch); } catch (e) { /* ignore */ }
      }

      // Move references off the duplicates before deleting them
      for (const dup of duplicates) {
        try {
          await base44.asServiceRole.entities.ExpenseTracking.updateMany(
            { user_id: dup.id },
            { $set: { user_id: keep.id } }
          );
        } catch (e) { /* ignore */ }
        try {
          await base44.asServiceRole.entities.ClientAdvisorAssignment.updateMany(
            { client_id: dup.id },
            { $set: { client_id: keep.id } }
          );
        } catch (e) { /* ignore */ }
        try {
          await base44.asServiceRole.entities.AllowedUser.delete(dup.id);
          merged++;
        } catch (e) { /* ignore */ }
      }

      details.push({ email, kept_id: keep.id, removed: duplicates.length });
    }

    return Response.json({ success: true, scanned: allAllowed.length, merged, details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
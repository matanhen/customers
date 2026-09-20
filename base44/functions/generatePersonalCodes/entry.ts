import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateUniquePersonalCode } from '../../shared/userIdentification.ts';

// Generates personal codes for all users who don't have one yet.
// Admin-only. Called from the admin dashboard.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.user_type !== 'admin') {
      return Response.json({ error: 'אין הרשאה - נדרש מנהל מערכת' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    let generated = 0;
    let skipped = 0;

    for (const u of users) {
      if (u.personal_code) {
        skipped++;
        continue;
      }
      const code = await generateUniquePersonalCode(base44);
      await base44.asServiceRole.entities.User.update(u.id, { personal_code: code });
      generated++;
    }

    return Response.json({ success: true, generated, skipped, total: users.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
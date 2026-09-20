import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Generates personal codes for all users who don't have one yet.
// Admin-only. Uses parallel batch updates for efficiency.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.user_type !== 'admin') {
      return Response.json({ error: 'אין הרשאה - נדרש מנהל מערכת' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();

    // Generate codes for users without one, ensuring uniqueness
    const existingCodes = new Set(users.map(u => (u.personal_code || '').toUpperCase()));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const updates = [];

    for (const u of users) {
      if (u.personal_code) continue;

      let code;
      let attempts = 0;
      do {
        code = '';
        for (let i = 0; i < 4; i++) {
          code += letters[Math.floor(Math.random() * letters.length)];
        }
        attempts++;
        if (attempts > 100) break;
      } while (existingCodes.has(code));

      existingCodes.add(code);
      updates.push({ id: u.id, personal_code: code });
    }

    // Update in parallel batches of 10
    const batchSize = 10;
    let success = 0;
    let failed = 0;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(u => base44.asServiceRole.entities.User.update(u.id, { personal_code: u.personal_code }))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') success++;
        else failed++;
      }
    }

    return Response.json({
      success: true,
      generated: success,
      failed,
      skipped: users.length - updates.length,
      total: users.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
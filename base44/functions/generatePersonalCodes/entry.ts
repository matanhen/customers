import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generatePersonalCode } from '../../shared/userIdentification.ts';

// Makes sure every client has a personal code:
//  - app users without a code
//  - clients that registered but have not logged in yet (code kept on their
//    registration record)
//  - clients that only exist as an advisor assignment (they get their
//    registration record + code)
// Admin-only.
const codeOf = (value) => (value || '').toString().trim().toUpperCase();
const emailOf = (value) => (value || '').toString().trim().toLowerCase();

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.user_type !== 'admin') {
      return Response.json({ error: 'אין הרשאה - נדרש מנהל מערכת' }, { status: 403 });
    }

    const [users, allowedUsers, assignments] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.AllowedUser.list(),
      base44.asServiceRole.entities.ClientAdvisorAssignment.list(),
    ]);

    const existingCodes = new Set();
    const registerCode = (value) => {
      const code = codeOf(value);
      if (code) existingCodes.add(code);
      return code;
    };
    users.forEach(u => registerCode(u.personal_code));
    allowedUsers.forEach(a => registerCode(a.personal_code));

    const nextCode = () => {
      let code;
      let attempts = 0;
      do {
        code = generatePersonalCode();
        attempts++;
        if (attempts > 200) break;
      } while (existingCodes.has(code));
      existingCodes.add(code);
      return code;
    };

    const userByEmail = new Map(users.map(u => [emailOf(u.email), u]));
    const allowedByEmail = new Map(allowedUsers.map(a => [emailOf(a.email), a]));

    // 1. App users without a code — reuse the code their registration record holds
    const userUpdates = [];
    for (const u of users) {
      if (codeOf(u.personal_code)) continue;
      const fromRegistration = codeOf(allowedByEmail.get(emailOf(u.email))?.personal_code);
      userUpdates.push({ id: u.id, personal_code: fromRegistration || nextCode() });
    }

    // 2. Registered clients without a code — reuse the code their app user holds
    const allowedUpdates = [];
    for (const a of allowedUsers) {
      if (codeOf(a.personal_code)) continue;
      const fromUser = codeOf(userByEmail.get(emailOf(a.email))?.personal_code);
      allowedUpdates.push({ id: a.id, personal_code: fromUser || nextCode() });
    }

    // 3. Clients known only from an advisor assignment — create their registration record
    let created = 0;
    let failed = 0;
    const seenEmails = new Set(allowedUsers.map(a => emailOf(a.email)));
    for (const a of assignments) {
      const email = emailOf(a.client_email);
      if (!email || seenEmails.has(email)) continue;
      seenEmails.add(email);
      try {
        await base44.asServiceRole.entities.AllowedUser.create({
          email,
          full_name: a.client_name || '',
          user_type: 'client',
          phone: '',
          personal_code: nextCode(),
        });
        created++;
      } catch (e) {
        failed++;
      }
    }

    // Apply updates in parallel batches
    const applyUpdates = async (entity, updates) => {
      let ok = 0;
      let bad = 0;
      for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(u => entity.update(u.id, { personal_code: u.personal_code }))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') ok++;
          else bad++;
        }
      }
      return { ok, bad };
    };

    const userResult = await applyUpdates(base44.asServiceRole.entities.User, userUpdates);
    const allowedResult = await applyUpdates(base44.asServiceRole.entities.AllowedUser, allowedUpdates);

    return Response.json({
      success: true,
      generated: userResult.ok + allowedResult.ok,
      failed: userResult.bad + allowedResult.bad + failed,
      skipped: (users.length - userUpdates.length) + (allowedUsers.length - allowedUpdates.length),
      clients_created: created,
      total: users.length + allowedUsers.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
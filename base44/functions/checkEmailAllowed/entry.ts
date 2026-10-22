import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. The pre-approved allow-list (emails are stored lowercase).
    const allowedUsers = await base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail });
    if (allowedUsers.length > 0) {
      return Response.json({ allowed: true });
    }

    // 2. A user who already has a platform account is registered — let them in,
    //    and backfill the allow-list so the admin sees them and future checks are
    //    fast. User emails can differ by case, so match case-insensitively.
    const users = asArray(await base44.asServiceRole.entities.User.list());
    const user = users.find(u => (u.email || '').toLowerCase() === normalizedEmail);
    if (user) {
      try {
        await base44.asServiceRole.entities.AllowedUser.create({
          email: normalizedEmail,
          full_name: user.full_name || user.custom_name || '',
          user_type: user.user_type || 'client',
          phone: user.phone || '',
          personal_code: user.personal_code || '',
        });
      } catch (e) { /* non-critical — still allow the login */ }
      return Response.json({ allowed: true });
    }

    return Response.json({ allowed: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateUniquePersonalCode } from '../../shared/userIdentification.ts';
import { normalizePhone } from '../../shared/phoneUtils.ts';

// Bulk-adds missing clients from a PDF import.
// Admin-only. Accepts a list of {name, email, phone}.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.user_type !== 'admin') {
      return Response.json({ error: 'אין הרשאה - נדרש מנהל מערכת' }, { status: 403 });
    }

    const body = await req.json();
    const { clients } = body;

    if (!clients || !Array.isArray(clients)) {
      return Response.json({ error: 'נדרש מערך clients' }, { status: 400 });
    }

    const results = [];
    let added = 0;
    let failed = 0;

    for (const client of clients) {
      try {
        if (!client.email) {
          results.push({ ...client, status: 'failed', error: 'חסר אימייל' });
          failed++;
          continue;
        }

        const normalizedEmail = client.email.trim().toLowerCase();

        // Check if already exists
        const existing = await base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail });
        if (existing.length > 0) {
          results.push({ ...client, status: 'failed', error: 'כבר קיים במערכת' });
          failed++;
          continue;
        }

        // Create AllowedUser
        const normalizedPhone = normalizePhone(client.phone || '');
        await base44.asServiceRole.entities.AllowedUser.create({
          email: normalizedEmail,
          full_name: client.name || '',
          user_type: 'client',
          phone: normalizedPhone,
        });

        // Invite the user
        await base44.asServiceRole.users.inviteUser(normalizedEmail, 'user');

        // Wait for user to be created, then update with name + phone
        await new Promise(r => setTimeout(r, 1500));
        const systemUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
        if (systemUsers[0]) {
          const personalCode = await generateUniquePersonalCode(base44);
          await base44.asServiceRole.entities.User.update(systemUsers[0].id, {
            user_type: 'client',
            full_name: client.name || '',
            custom_name: client.name || '',
            phone: normalizedPhone,
            personal_code: personalCode,
          });
        }

        results.push({ ...client, status: 'added' });
        added++;
      } catch (e) {
        results.push({ ...client, status: 'failed', error: e.message });
        failed++;
      }
    }

    return Response.json({ success: true, added, failed, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
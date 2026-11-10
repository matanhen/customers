import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const INACTIVE_DAYS = 7;
const MESSAGE = 'לא נכנסת מעל שבוע להתעדכן בנוגע לכסף שלך, זה הזמן להיכנס';
const TITLE = 'תזכורת מהמערכת';
const APP_URL = 'https://customers.matanhen.com/Home';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const cutoff = Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;

    // The User entity only allows a plain list from the server (no filter query).
    const listed = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const users = Array.isArray(listed) ? listed : (listed?.items || []);

    const targets = users.filter((u) => {
      if (!u?.id || u.is_service || u.disabled) return false;
      if (!u.last_login_date) return false;
      const last = new Date(u.last_login_date).getTime();
      return Number.isFinite(last) && last < cutoff;
    });

    if (dryRun) {
      return Response.json({
        dry_run: true,
        inactive_count: targets.length,
        inactive: targets.map((u) => ({ id: u.id, email: u.email, last_login_date: u.last_login_date })),
      });
    }

    // Send in small parallel batches (worker allows ~6 concurrent connections).
    let sent = 0;
    const failures = [];
    for (let i = 0; i < targets.length; i += 6) {
      const batch = targets.slice(i, i + 6);
      const settled = await Promise.allSettled(
        batch.map((u) =>
          base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: u.id,
            title: TITLE,
            content: MESSAGE,
            action_label: 'כניסה לאפליקציה',
            action_url: APP_URL,
          })
        )
      );
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          sent += 1;
        } else {
          failures.push({ email: batch[index].email, error: result.reason?.message || 'failed' });
        }
      });
    }

    return Response.json({
      inactive_count: targets.length,
      sent,
      failed: failures.length,
      failures: failures.slice(0, 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
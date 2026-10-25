import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ensureClientPersonalCode } from '../../shared/userIdentification.ts';
import { normalizePhone } from '../../shared/phoneUtils.ts';

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

// Adds a user idempotently.
// - The same email is never stored twice (AllowedUser or User).
// - Existing data is never overwritten: only empty fields are filled.
// - Advisors may add only clients, and the client is assigned to the adding advisor.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const email = (body.email || '').toString().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'כתובת אימייל לא תקינה' }, { status: 400 });
    }
    const name = (body.full_name || '').toString().trim();
    const phone = normalizePhone(body.phone || '');

    const isAdminCaller = caller.role === 'admin' || caller.user_type === 'admin';
    const isAdvisorCaller = caller.user_type === 'advisor';
    if (!isAdminCaller && !isAdvisorCaller) {
      return Response.json({ error: 'אין הרשאה להוסיף משתמשים' }, { status: 403 });
    }

    let userType = (body.user_type || 'client').toString();
    if (!['client', 'advisor', 'admin'].includes(userType)) userType = 'client';
    if (!isAdminCaller && userType !== 'client') {
      return Response.json({ error: 'יועצים יכולים להוסיף לקוחות בלבד' }, { status: 403 });
    }

    // The advisor a client is assigned to
    let advisorId = '';
    let advisorEmail = '';
    if (userType === 'client') {
      if (isAdminCaller) {
        advisorId = (body.advisor_id || '').toString();
        advisorEmail = (body.advisor_email || '').toString().toLowerCase();
      } else {
        advisorId = caller.id;
        advisorEmail = (caller.email || '').toString().toLowerCase();
      }
    }

    // --- AllowedUser (approval / registration record) — never duplicated ---
    let allowed = asArray(await base44.asServiceRole.entities.AllowedUser.filter({ email }))[0] || null;
    const isNew = !allowed;
    if (allowed) {
      const patch: Record<string, any> = {};
      if (!allowed.full_name && name) patch.full_name = name;
      if (!allowed.phone && phone) patch.phone = phone;
      if (!allowed.user_type && userType) patch.user_type = userType;
      if (Object.keys(patch).length) {
        allowed = await base44.asServiceRole.entities.AllowedUser.update(allowed.id, patch);
      }
    } else {
      allowed = await base44.asServiceRole.entities.AllowedUser.create({
        email, full_name: name, user_type: userType, phone,
      });
    }

    // Personal code from registration (kept on the registration record until login)
    await ensureClientPersonalCode(base44, { email, full_name: name, phone });

    // --- Invite only a client that has no app account yet (never re-invite) ---
    let userRecord = asArray(await base44.asServiceRole.entities.User.filter({ email }))[0] || null;
    if (!userRecord) {
      try {
        await base44.asServiceRole.users.inviteUser(email, userType === 'admin' ? 'admin' : 'user');
        await new Promise(r => setTimeout(r, 1000));
        userRecord = asArray(await base44.asServiceRole.entities.User.filter({ email }))[0] || null;
      } catch (e) { /* invitation is optional */ }
    }

    // --- Existing app User: fill only empty fields, never overwrite ---
    if (userRecord) {
      const patch: Record<string, any> = {};
      if (!userRecord.user_type) patch.user_type = userType;
      if (!userRecord.full_name && name) patch.full_name = name;
      if (!userRecord.custom_name && name) patch.custom_name = name;
      if (!userRecord.phone && phone) patch.phone = phone;
      if (isAdminCaller && userType === 'admin' && userRecord.role !== 'admin') patch.role = 'admin';
      if (Object.keys(patch).length) {
        userRecord = await base44.asServiceRole.entities.User.update(userRecord.id, patch);
      }
    }

    // --- Assignment for a client: only when they have none (never steal) ---
    let assignmentCreated = false;
    if (userType === 'client' && advisorId) {
      const existingAssignments = asArray(await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: email }));
      if (!existingAssignments.length) {
        await base44.asServiceRole.entities.ClientAdvisorAssignment.create({
          client_id: userRecord?.id || '',
          client_email: email,
          client_name: name || userRecord?.full_name || '',
          advisor_id: advisorId,
          advisor_email: advisorEmail,
        });
        assignmentCreated = true;
      }
    }

    return Response.json({
      success: true,
      created: isNew,
      already_exists: !isNew,
      email,
      user_type: userType,
      has_app_account: !!userRecord,
      assignment_created: assignmentCreated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
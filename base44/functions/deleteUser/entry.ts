import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Deletes a user from the app: their account record, their registration record
// (AllowedUser) and their advisor assignments — in one server-side call.
//
// The platform only allows deleting another user's account record with service-role
// permissions (a regular app user can only read/update their own record), so this
// runs on the server. An admin may delete any account; a user may delete their own.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toString().trim().toLowerCase();
    const extraId = (body.user_id || '').toString();

    if (!email && !extraId) {
      return Response.json({ error: 'נדרש אימייל או מזהה משתמש' }, { status: 400 });
    }

    // Authorization: admin for any account, or the user deleting their own
    const caller = await base44.auth.me().catch(() => null);
    const callerEmail = (caller?.email || '').toString().trim().toLowerCase();
    const callerIsAdmin = caller?.role === 'admin' || caller?.user_type === 'admin';
    const isSelf = !!email && callerEmail === email;
    if (!callerIsAdmin && !isSelf) {
      return Response.json({ error: 'אין הרשאה למחוק משתמשים' }, { status: 403 });
    }

    const asArray = (result) => (Array.isArray(result) ? result : (result?.items || []));
    const emailOf = (record) => (record?.email || '').toString().trim().toLowerCase();

    // Every record of this person, matched case-insensitively
    const allUsers = asArray(await base44.asServiceRole.entities.User.list());
    const allAllowed = asArray(await base44.asServiceRole.entities.AllowedUser.list());

    const userIds = [...new Set(allUsers
      .filter(u => (email && emailOf(u) === email) || (extraId && u.id === extraId))
      .map(u => u.id))];
    const allowedIds = [...new Set(allAllowed
      .filter(a => (email && emailOf(a) === email) || (extraId && a.id === extraId))
      .map(a => a.id))];

    if (userIds.length === 0 && allowedIds.length === 0) {
      return Response.json({ success: true, not_found: true, deleted: { users: 0, allowed_users: 0, assignments: 0 } });
    }

    const errors = [];
    const deleted = { users: 0, allowed_users: 0, assignments: 0 };

    // Advisor assignments — by client email, and by the deleted ids (client or advisor)
    const assignmentIds = new Set();
    if (email) {
      const byEmail = asArray(await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: email }));
      byEmail.forEach(a => assignmentIds.add(a.id));
    }
    for (const id of userIds) {
      const asClient = asArray(await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_id: id }));
      asClient.forEach(a => assignmentIds.add(a.id));
      const asAdvisor = asArray(await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ advisor_id: id }));
      asAdvisor.forEach(a => assignmentIds.add(a.id));
    }

    for (const id of assignmentIds) {
      try {
        await base44.asServiceRole.entities.ClientAdvisorAssignment.delete(id);
        deleted.assignments++;
      } catch (e) {
        errors.push(`שיוך יועץ: ${e.message}`);
      }
    }

    for (const id of userIds) {
      try {
        await base44.asServiceRole.entities.User.delete(id);
        deleted.users++;
      } catch (e) {
        errors.push(`חשבון משתמש: ${e.message}`);
      }
    }

    for (const id of allowedIds) {
      try {
        await base44.asServiceRole.entities.AllowedUser.delete(id);
        deleted.allowed_users++;
      } catch (e) {
        errors.push(`רשומת הרשמה: ${e.message}`);
      }
    }

    return Response.json({ success: errors.length === 0, deleted, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
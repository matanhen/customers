import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { relinkUserData, relinkAssignments, clientHasData } from '../../shared/relinkUserData.ts';

// Deletes a user from the app: their account record and advisor assignments.
// Their registration record (AllowedUser) is KEPT as the permanent data anchor
// whenever the client still has data — every data record is first re-linked to
// it, so a deleted account never orphans the client's financial history.
//
// The platform only allows deleting another user's account record with
// service-role permissions, so this runs on the server.
// An admin may delete any account; a user may delete their own.
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
    const rawEmail = (body.email || '').toString().trim();
    const emailVariants = [...new Set([email, rawEmail].filter(Boolean))];

    // Look the person's records up directly (never a full-table scan first),
    // so the deletion acts on exactly this person and returns fast.
    const findRecords = async (entity) => {
      const found = new Map();
      for (const variant of emailVariants) {
        try {
          for (const record of asArray(await entity.filter({ email: variant }))) {
            found.set(record.id, record);
          }
        } catch (e) { /* try the next variant */ }
      }
      if (extraId && !found.has(extraId)) {
        try {
          const record = await entity.get(extraId);
          if (record?.id) found.set(record.id, record);
        } catch (e) { /* not this entity */ }
      }
      if (found.size === 0) {
        // Case-insensitive fallback for records stored with different casing
        const all = asArray(await entity.list('-created_date', 2000));
        for (const record of all) {
          if ((email && emailOf(record) === email) || (extraId && record.id === extraId)) {
            found.set(record.id, record);
          }
        }
      }
      return [...found.values()];
    };

    const allUsers = await findRecords(base44.asServiceRole.entities.User);
    const allAllowed = await findRecords(base44.asServiceRole.entities.AllowedUser);

    const userIds = [...new Set(allUsers.map(u => u.id))];
    const allowedIds = [...new Set(allAllowed.map(a => a.id))];

    if (userIds.length === 0 && allowedIds.length === 0) {
      return Response.json({ success: true, not_found: true, deleted: { users: 0, allowed_users: 0, assignments: 0 }, preserved_data: { moved: 0, merged: 0 } });
    }

    const errors = [];
    const deleted = { users: 0, allowed_users: 0, assignments: 0 };
    const preserved = { moved: 0, merged: 0 };

    // The registration record is the data anchor. Create one when the client
    // only ever had an account record, so their data has somewhere to live.
    let anchorId = allowedIds[0] || null;
    if (!anchorId && userIds.length > 0) {
      const user = allUsers.find(u => userIds.includes(u.id));
      if (user) {
        try {
          const created = await base44.asServiceRole.entities.AllowedUser.create({
            email: user.email,
            full_name: user.custom_name || user.full_name || '',
            phone: user.phone || '',
            personal_code: user.personal_code || '',
            user_type: 'client',
          });
          anchorId = created?.id || null;
        } catch (e) {
          errors.push('יצירת רשומת הרשמה: ' + e.message);
        }
      }
    }

    // Move every data record from the account record to the anchor — verified
    // record by record, so nothing is orphaned by the deletion below.
    if (anchorId) {
      for (const id of userIds) {
        const relink = await relinkUserData(base44, id, anchorId);
        preserved.moved += relink.moved;
        preserved.merged += relink.merged;
        if (relink.failed > 0) errors.push(...relink.errors.slice(0, 5));
      }
    }

    if ((!anchorId && userIds.length > 0) || errors.length > 0) {
      return Response.json({ success: false, error: 'מחיקת החשבון נעצרה כדי לשמור על הנתונים', errors, preserved_data: preserved }, { status: 409 });
    }

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

    for (const id of allowedIds) {
      try {
        const asClient = asArray(await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_id: id }));
        asClient.forEach(a => assignmentIds.add(a.id));
      } catch (e) { /* non-critical */ }
    }

    for (const id of assignmentIds) {
      try {
        await base44.asServiceRole.entities.ClientAdvisorAssignment.delete(id);
        deleted.assignments++;
      } catch (e) {
        errors.push('שיוך יועץ: ' + e.message);
      }
    }

    for (const id of userIds) {
      try {
        await base44.asServiceRole.entities.User.delete(id);
        deleted.users++;
      } catch (e) {
        errors.push('חשבון משתמש: ' + e.message);
      }
    }

    // The registration record is only removed when the client has no data at
    // all — otherwise it stays as the anchor that keeps their data reachable.
    let hasData = false;
    if (anchorId) {
      hasData = await clientHasData(base44, [anchorId]);
    }
    for (const id of allowedIds) {
      // The anchor stays only as a holder for the client's history, but it is
      // marked deleted so it grants no access and never returns to any list.
      if (hasData && id === anchorId) {
        try {
          await base44.asServiceRole.entities.AllowedUser.update(id, {
            is_deleted: true,
            phone: '',
            personal_code: '',
          });
          deleted.allowed_users++;
        } catch (e) {
          errors.push('רשומת הרשמה: ' + e.message);
        }
        continue;
      }
      try {
        await base44.asServiceRole.entities.AllowedUser.delete(id);
        deleted.allowed_users++;
      } catch (e) {
        errors.push('רשומת הרשמה: ' + e.message);
      }
    }

    return Response.json({ success: errors.length === 0, deleted, preserved_data: preserved, data_anchor_kept: hasData, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
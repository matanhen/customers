import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { relinkUserData, clientHasData } from '../../shared/relinkUserData.ts';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { email, token } = body;

    // Validate token
    const expectedToken = Deno.env.get('EXTERNAL_EXPENSE_TOKEN');
    if (!token || token !== expectedToken) {
      return Response.json({ error: 'Unauthorized - invalid token' }, { status: 401 });
    }

    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const asArray = (result) => (Array.isArray(result) ? result : (result?.items || []));

    // Find the User record and registration records
    const users = asArray(await base44.asServiceRole.entities.User.filter({ email: normalizedEmail }));
    const allowedUsers = asArray(await base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail }));

    // The registration record is the permanent data anchor — it is kept
    // whenever the client still has data, and any data stored under the
    // account record is re-linked to it before the account is removed.
    // Client data is never deleted.
    let anchorId = allowedUsers[0]?.id || null;
    if (!anchorId && users.length > 0) {
      const user = users[0];
      try {
        const created = await base44.asServiceRole.entities.AllowedUser.create({
          email: user.email,
          full_name: user.custom_name || user.full_name || '',
          phone: user.phone || '',
          personal_code: user.personal_code || '',
          user_type: 'client',
        });
        anchorId = created?.id || null;
      } catch (e) { /* keep going — anchor is best-effort */ }
    }

    const preserved = { moved: 0, merged: 0 };
    if (anchorId) {
      for (const user of users) {
        const relink = await relinkUserData(base44, user.id, anchorId);
        preserved.moved += relink.moved;
        preserved.merged += relink.merged;
      }
    }

    // Delete the User account record
    let deletedUserId = null;
    if (users.length > 0) {
      deletedUserId = users[0].id;
      await base44.asServiceRole.entities.User.delete(users[0].id);
    }

    // Delete ClientAdvisorAssignment records
    const assignments = asArray(await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: normalizedEmail }));
    for (const a of assignments) {
      await base44.asServiceRole.entities.ClientAdvisorAssignment.delete(a.id);
    }

    // Remove the registration record only when it anchors no data
    let deletedAllowed = false;
    const hasData = anchorId ? await clientHasData(base44, [anchorId]) : false;
    for (const allowed of allowedUsers) {
      if (hasData && allowed.id === anchorId) continue;
      await base44.asServiceRole.entities.AllowedUser.delete(allowed.id);
      deletedAllowed = true;
    }

    return Response.json({
      success: true,
      email: normalizedEmail,
      deleted_user: deletedUserId !== null,
      deleted_allowed_user: deletedAllowed,
      deleted_assignments: assignments.length,
      preserved_data: preserved,
      data_anchor_kept: hasData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
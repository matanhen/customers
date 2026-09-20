import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

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

    // Find and delete User record
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    let deletedUserId = null;
    if (users.length > 0) {
      deletedUserId = users[0].id;
      await base44.asServiceRole.entities.User.delete(users[0].id);
    }

    // Delete AllowedUser record
    const allowedUsers = await base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail });
    let deletedAllowed = false;
    if (allowedUsers.length > 0) {
      await base44.asServiceRole.entities.AllowedUser.delete(allowedUsers[0].id);
      deletedAllowed = true;
    }

    // Delete ClientAdvisorAssignment records
    const assignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: normalizedEmail });
    for (const a of assignments) {
      await base44.asServiceRole.entities.ClientAdvisorAssignment.delete(a.id);
    }

    return Response.json({
      success: true,
      email: normalizedEmail,
      deleted_user: deletedUserId !== null,
      deleted_allowed_user: deletedAllowed,
      deleted_assignments: assignments.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
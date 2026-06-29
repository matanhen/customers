import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allowedUsers = await base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail });

    return Response.json({ allowed: allowedUsers.length > 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
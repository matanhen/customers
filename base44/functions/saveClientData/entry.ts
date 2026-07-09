import { createClientFromRequest } from 'npm:@base44/sdk@0.8.28';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.user_type !== 'admin' && user.user_type !== 'advisor') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { entityName, clientUserId, data, recordId } = await req.json();

    if (!entityName || !clientUserId || !data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (recordId) {
      result = await base44.asServiceRole.entities[entityName].update(recordId, data);
    } else {
      result = await base44.asServiceRole.entities[entityName].create({ ...data, user_id: clientUserId });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
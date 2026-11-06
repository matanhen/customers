import { createClientFromRequest } from 'npm:@base44/sdk@0.8.28';

const ALLOWED_ENTITIES = [
  'FinancialReflection',
  'ExpenseTracking',
  'MonthlyPlan',
  'MonthlyBalance',
  'Debt',
  'Investment',
  'PortfolioSettings',
  'GoalSettings',
  'FinancialGoal',
  'PensionData',
  'FinancialPlan',
  'FinancialPlanData',
  'ExpenseFixedOverride',
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();

        if (!currentUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (currentUser.user_type !== 'advisor' && currentUser.user_type !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { clientUserId, clientEmail } = body;
        // Support both 'entityName' and 'entity' parameter names
        const entityName = body.entityName || body.entity;

        // Special case: return User records by email (for resolving real user ID)
        if (entityName === 'User') {
            if (!clientEmail) {
                return Response.json({ error: 'Missing clientEmail for User lookup' }, { status: 400 });
            }
            const users = await base44.asServiceRole.entities.User.filter({ email: clientEmail });
            return Response.json(users);
        }

        if (!entityName) {
            return Response.json({ error: 'Missing entityName parameter' }, { status: 400 });
        }

        if (!ALLOWED_ENTITIES.includes(entityName)) {
            return Response.json({ error: 'Invalid entity name' }, { status: 400 });
        }

        // Union every id that belongs to this client: the account id and every
        // registration record id. A client's history can be split across them
        // after a duplicate account or a re-created registration record, so
        // stopping at the first non-empty id used to hide the rest of the data.
        const ownerIds = new Set();
        if (clientUserId) ownerIds.add(clientUserId);
        if (clientEmail) {
          const [users, allowedUsers] = await Promise.all([
            base44.asServiceRole.entities.User.filter({ email: clientEmail }),
            base44.asServiceRole.entities.AllowedUser.filter({ email: clientEmail }),
          ]);
          [...users, ...allowedUsers].forEach(record => { if (record?.id) ownerIds.add(record.id); });
        }

        const ids = [...ownerIds];
        const pages = await Promise.all(ids.map(id =>
          base44.asServiceRole.entities[entityName].filter({ user_id: id }).catch(() => [])
        ));

        // Union, never "first id wins": a record is identified by its own id,
        // and the richest record wins when the same id appears twice.
        const byId = new Map();
        for (const page of pages) {
          for (const record of (page || [])) {
            if (record?.id) byId.set(record.id, record);
          }
        }
        const data = [...byId.values()];

        return Response.json({ success: true, data, owner_ids: ids });
    } catch (error) {
        console.error('Error fetching client data:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
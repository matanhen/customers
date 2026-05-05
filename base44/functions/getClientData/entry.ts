import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ENTITIES = [
  'FinancialReflection',
  'ExpenseTracking',
  'MonthlyPlan',
  'Debt',
  'Investment',
  'PortfolioSettings',
  'GoalSettings',
  'FinancialGoal',
  'PensionData',
  'FinancialPlan',
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

        const { clientUserId, clientEmail, entityName } = await req.json();

        if (!entityName) {
            return Response.json({ error: 'Missing entityName parameter' }, { status: 400 });
        }

        if (!ALLOWED_ENTITIES.includes(entityName)) {
            return Response.json({ error: 'Invalid entity name' }, { status: 400 });
        }

        // Strategy: try by clientUserId first, then fallback to all User IDs matching the email
        let data = [];

        if (clientUserId) {
            data = await base44.asServiceRole.entities[entityName].filter({ user_id: clientUserId });
        }

        // If nothing found and we have an email, try to find the correct user_id by email
        if (data.length === 0 && clientEmail) {
            const users = await base44.asServiceRole.entities.User.filter({ email: clientEmail });
            for (const user of users) {
                const records = await base44.asServiceRole.entities[entityName].filter({ user_id: user.id });
                if (records.length > 0) {
                    data = records;
                    break;
                }
            }
        }

        return Response.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching client data:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
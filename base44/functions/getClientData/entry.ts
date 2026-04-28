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

        const { clientUserId, entityName } = await req.json();

        if (!clientUserId || !entityName) {
            return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (!ALLOWED_ENTITIES.includes(entityName)) {
            return Response.json({ error: 'Invalid entity name' }, { status: 400 });
        }

        const data = await base44.asServiceRole.entities[entityName].filter({ user_id: clientUserId });

        return Response.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching client data:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
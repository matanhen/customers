import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();

        if (!currentUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only advisors and admins can use this function
        if (currentUser.user_type !== 'advisor' && currentUser.user_type !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { clientUserId, entityName } = await req.json();

        if (!clientUserId || !entityName) {
            return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Use service role to fetch client data
        let data;
        if (entityName === 'FinancialReflection') {
            data = await base44.asServiceRole.entities.FinancialReflection.filter({ user_id: clientUserId });
        } else if (entityName === 'ExpenseTracking') {
            data = await base44.asServiceRole.entities.ExpenseTracking.filter({ user_id: clientUserId });
        } else if (entityName === 'MonthlyPlan') {
            data = await base44.asServiceRole.entities.MonthlyPlan.filter({ user_id: clientUserId });
        } else {
            return Response.json({ error: 'Invalid entity name' }, { status: 400 });
        }

        return Response.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching client data:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
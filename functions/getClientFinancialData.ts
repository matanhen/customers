import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();

        if (!currentUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { clientUserId, entityName } = await req.json();

        if (!clientUserId || !entityName) {
            return Response.json({ error: 'Missing clientUserId or entityName' }, { status: 400 });
        }

        const isAdmin = currentUser.user_type === 'admin';
        const isAdvisor = currentUser.user_type === 'advisor';

        // Check permissions
        if (!isAdmin && !isAdvisor) {
            return Response.json({ error: 'Forbidden: Only advisors and admins can access this' }, { status: 403 });
        }

        // If advisor, verify they're assigned to this client
        if (isAdvisor && clientUserId !== currentUser.id) {
            const assignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({
                advisor_id: currentUser.id,
                client_id: clientUserId
            });

            if (assignments.length === 0) {
                return Response.json({ error: 'Forbidden: Client not assigned to this advisor' }, { status: 403 });
            }
        }

        // Fetch the data using service role
        const data = await base44.asServiceRole.entities[entityName].filter({ user_id: clientUserId });

        return Response.json({ data });
    } catch (error) {
        console.error('Error fetching client data:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
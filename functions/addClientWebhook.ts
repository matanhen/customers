import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        // Verify webhook secret from query parameter
        const url = new URL(req.url);
        const secret = url.searchParams.get('secret');
        const expectedSecret = Deno.env.get('WEBHOOK_SECRET');

        if (!secret || secret !== expectedSecret) {
            return Response.json({ error: 'Unauthorized - Invalid webhook secret' }, { status: 401 });
        }

        // Parse request body
        const body = await req.json();
        const { name, email } = body;

        if (!name || !email) {
            return Response.json({ error: 'Missing required fields: name and email' }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        // Check if user already exists
        const existingAllowed = await base44.asServiceRole.entities.AllowedUser.filter({ email });
        if (existingAllowed.length > 0) {
            return Response.json({ 
                message: 'Client already exists',
                client: existingAllowed[0]
            }, { status: 200 });
        }

        // Get first admin to assign the client to
        const admins = await base44.asServiceRole.entities.User.filter({ user_type: 'admin' });
        const adminId = admins.length > 0 ? admins[0].id : '';
        const adminEmail = admins.length > 0 ? admins[0].email : '';

        // Create AllowedUser
        const allowedUser = await base44.asServiceRole.entities.AllowedUser.create({
            email: email,
            full_name: name,
            user_type: 'client'
        });

        // Create User entity
        const newUser = await base44.asServiceRole.entities.User.create({
            email: email,
            full_name: name,
            user_type: 'client'
        });

        // Create ClientAdvisorAssignment
        if (adminId) {
            await base44.asServiceRole.entities.ClientAdvisorAssignment.create({
                client_id: newUser.id,
                client_email: email,
                client_name: name,
                advisor_id: adminId,
                advisor_email: adminEmail
            });
        }

        return Response.json({
            success: true,
            message: 'Client added successfully',
            client: {
                id: newUser.id,
                name: name,
                email: email
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
});
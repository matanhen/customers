import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        // Only accept POST requests
        if (req.method !== 'POST') {
            return Response.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
        }

        // Parse request body
        const body = await req.json();
        const { name, email } = body;

        if (!name || !email) {
            return Response.json({ error: 'Missing required fields: name and email' }, { status: 400 });
        }

        // Initialize Base44 client
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

        // Invite the user so they appear in the system immediately
        await base44.asServiceRole.users.inviteUser(email, 'user');

        // Wait briefly then find the created user
        await new Promise(r => setTimeout(r, 1500));
        const systemUsers = await base44.asServiceRole.entities.User.filter({ email });
        const newUserId = systemUsers[0]?.id || '';

        // Update user_type to client
        if (newUserId) {
            await base44.asServiceRole.entities.User.update(newUserId, { user_type: 'client', full_name: name });
        }

        // Create ClientAdvisorAssignment
        if (adminId) {
            await base44.asServiceRole.entities.ClientAdvisorAssignment.create({
                client_id: newUserId,
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
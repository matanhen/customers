import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Only process create events
        if (event?.type !== 'create' || event?.entity_name !== 'User') {
            return Response.json({ message: 'Not a user creation event' });
        }

        const userId = event.entity_id;
        const userEmail = data?.email;

        if (!userId || !userEmail) {
            return Response.json({ error: 'Missing user ID or email' }, { status: 400 });
        }

        // Check if email has uppercase letters
        const normalizedEmail = userEmail.toLowerCase();
        
        if (normalizedEmail !== userEmail) {
            // Update user with normalized email
            await base44.asServiceRole.entities.User.update(userId, {
                email: normalizedEmail
            });
            
            console.log(`Normalized email from ${userEmail} to ${normalizedEmail}`);
            
            return Response.json({ 
                success: true,
                message: `Email normalized from ${userEmail} to ${normalizedEmail}`
            });
        }

        return Response.json({ 
            success: true,
            message: 'Email already normalized'
        });
    } catch (error) {
        console.error('Error normalizing email:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
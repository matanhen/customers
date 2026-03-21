import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Process create events for AllowedUser
        if (event?.type !== 'create' || event?.entity_name !== 'AllowedUser') {
            return Response.json({ message: 'Not an AllowedUser creation event' });
        }

        const allowedUserId = event.entity_id;
        const userEmail = data?.email;

        if (!allowedUserId || !userEmail) {
            return Response.json({ error: 'Missing AllowedUser ID or email' }, { status: 400 });
        }

        // Check if email has uppercase letters
        const normalizedEmail = userEmail.toLowerCase();
        
        if (normalizedEmail !== userEmail) {
            // Update AllowedUser with normalized email
            await base44.asServiceRole.entities.AllowedUser.update(allowedUserId, {
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
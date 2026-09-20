import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Identifies a user by their personal code.
// Called by the WhatsApp agent when a user sends "קוד אישי: XXXX".
// Returns the user's info (id, name, phone, email, user_type) so the agent
// can associate all subsequent messages with this user.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const personalCode = (body.personal_code || '').toString().trim().toUpperCase();

    if (!personalCode) {
      return Response.json({ error: 'נדרש קוד אישי' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => (u.personal_code || '').toUpperCase() === personalCode);

    if (!user) {
      return Response.json({ error: 'קוד לא תקין' }, { status: 404 });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name || user.custom_name || '',
        email: user.email || '',
        phone: user.phone || '',
        user_type: user.user_type || 'client',
        personal_code: user.personal_code,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
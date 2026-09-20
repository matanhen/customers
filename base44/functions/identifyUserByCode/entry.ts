import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Identifies a user by their personal code.
// Called by the WhatsApp agent when a user sends "קוד אישי: XXXX".
// Returns the user's info (id, name, phone, email, user_type) so the agent
// can associate all subsequent messages with this user.
//
// Also updates the user's phone from the WhatsApp conversation (whatsapp_phone),
// so that sendClientNotification can find their conversation later.
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

    // Update the user's phone from the WhatsApp conversation if provided.
    // This is critical: sendClientNotification finds the client's conversation
    // by matching their phone. Without it, notifications silently fail.
    const whatsappPhone = (body.whatsapp_phone || '').toString().trim();
    if (whatsappPhone) {
      let normalizedPhone = whatsappPhone.replace(/[\s\-()]/g, '');
      if (normalizedPhone.startsWith('+972')) normalizedPhone = '0' + normalizedPhone.slice(4);
      else if (normalizedPhone.startsWith('972')) normalizedPhone = '0' + normalizedPhone.slice(3);

      if (normalizedPhone && normalizedPhone !== (user.phone || '')) {
        try {
          await base44.asServiceRole.entities.User.update(user.id, { phone: normalizedPhone });
        } catch (e) { /* non-critical */ }
      }
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.custom_name || user.full_name || '',
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizePhone } from '../../shared/phoneUtils.ts';
import { findUserByPersonalCode } from '../../shared/userIdentification.ts';

// Identifies a user by their personal code.
// Called by the WhatsApp agent when a user sends "קוד אישי: XXXX".
// Returns the user's info (id, name, phone, email, user_type) so the agent
// can associate all subsequent messages with this user.
//
// The code is looked up on the app user records AND on the client registration
// records, so clients that registered but have not logged in yet are found too.
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

    const user = await findUserByPersonalCode(base44, personalCode);

    if (!user) {
      return Response.json({ error: 'קוד לא תקין' }, { status: 404 });
    }

    // Update the user's phone from the WhatsApp conversation if provided.
    // Store in local Israeli format (0XX...) — sendWhatsappNotification converts
    // to 972... at match time, so no need to store international format.
    const whatsappPhone = (body.whatsapp_phone || '').toString().trim();
    if (whatsappPhone && user.id) {
      const localPhone = normalizePhone(whatsappPhone);

      if (localPhone && localPhone !== (user.phone || '')) {
        try {
          await base44.asServiceRole.entities.User.update(user.id, { phone: localPhone });
        } catch (e) { /* non-critical */ }
      }
    }

    return Response.json({
      success: true,
      user: {
        id: user.id || '',
        full_name: user.custom_name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        user_type: user.user_type || 'client',
        personal_code: user.personal_code || personalCode,
      },
      account_pending: !user.id,
      note: user.id
        ? undefined
        : 'הלקוח רשום במערכת אך טרם התחבר לאפליקציה, ולכן אין עדיין חשבון לתיעוד הוצאות. יש להפנות אותו להיכנס פעם אחת לאפליקציה.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
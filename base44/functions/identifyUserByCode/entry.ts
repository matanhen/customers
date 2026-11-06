import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { normalizePhone } from '../../shared/phoneUtils.ts';
import { findUserByPersonalCode, isPhoneOwnedByOther } from '../../shared/userIdentification.ts';

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
    // The agent may send the code, the whole message, or nothing but the phone.
    const personalCode = (body.personal_code || body.personalCode || body.code || body.text || '')
      .toString().trim().toUpperCase();

    // The WhatsApp number is the fallback identifier: a client whose code
    // changed after they got their personal link is still recognized, and the
    // code they sent is saved back onto their record.
    const whatsappPhone = (body.whatsapp_phone || body.phone || '').toString().trim();

    if (!personalCode && !whatsappPhone) {
      return Response.json({ error: 'נדרש קוד אישי או מספר טלפון' }, { status: 400 });
    }

    const user = await findUserByPersonalCode(base44, personalCode, whatsappPhone);

    if (!user) {
      return Response.json({ error: 'קוד לא תקין' }, { status: 404 });
    }

    // Update the user's phone from the WhatsApp conversation if provided.
    // Store in local Israeli format (0XX...) — sendWhatsappNotification converts
    // to 972... at match time, so no need to store international format.
    const localPhone = whatsappPhone ? normalizePhone(whatsappPhone) : '';

    // A number that already belongs to a different client is never written onto
    // this record — that is what made two clients overwrite each other's phone
    // (and then receive each other's messages and data).
    const phoneTakenByOther = localPhone
      ? await isPhoneOwnedByOther(base44, localPhone, user.email)
      : false;
    const canSavePhone = !!localPhone && !phoneTakenByOther;

    if (canSavePhone && user.id && localPhone !== (user.phone || '')) {
      try {
        await base44.asServiceRole.entities.User.update(user.id, { phone: localPhone });
        user.phone = localPhone;
      } catch (e) { /* non-critical */ }
    }

    // Keep the client's registration record in sync as well. This is the record
    // that exists even before the client ever logs in, and the phone stored here
    // is what lets the bot recognize them on later messages (and what advisors
    // use to reach them).
    if (canSavePhone && user.email) {
      try {
        const allowed = (await base44.asServiceRole.entities.AllowedUser.filter({
          email: user.email.toString().trim().toLowerCase(),
        }))[0];
        if (localPhone && localPhone !== (allowed?.phone || '')) {
          await base44.asServiceRole.entities.AllowedUser.update(allowed.id, { phone: localPhone });
          user.phone = localPhone;
        } else if (localPhone && !user.phone) {
          user.phone = localPhone;
        }
      } catch (e) { /* non-critical */ }
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
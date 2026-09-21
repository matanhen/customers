import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Builds a personal WhatsApp link for a single user that, when opened,
// starts a conversation with the expense_tracker agent.
//
// Each call to base44.agents.getWhatsAppConnectURL generates a fresh
// activation code (B44-XXXXXXXX) — so every user gets their OWN activation
// code. We follow the connect URL redirect to wa.me/<phone>?text=<msg>,
// decode the prepared message (which contains the activation code), append
// the user's personal 4-letter code on its own line, and rebuild a final
// wa.me link.
//
// Payload: { user_id }  (admin only)
// Returns: { link, phone, activation_code, personal_code }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: building a connect link for arbitrary users
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin' && caller.user_type !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (e) { /* empty body ok */ }
    const userId = body.user_id;
    if (!userId) return Response.json({ error: 'user_id is required' }, { status: 400 });

    // Fetch the user's personal code (service role — any user)
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const targetUser = users[0];
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });

    const personalCode = (targetUser.personal_code || '').toUpperCase();

    // Get a fresh connect URL — each call yields a new activation code
    let connectUrl;
    try {
      connectUrl = base44.agents.getWhatsAppConnectURL('expense_tracker');
    } catch (e) {
      return Response.json({ error: 'Could not get connect URL' }, { status: 500 });
    }

    // Follow the redirect to the wa.me URL
    const resp = await fetch(connectUrl, { redirect: 'manual' });
    const location = resp.headers.get('location') || '';

    const phoneMatch = location.match(/wa\.me\/(\d+)/);
    const textMatch = location.match(/[?&]text=([^&]+)/);

    if (!phoneMatch || !textMatch) {
      return Response.json({
        error: 'Could not extract phone/text from redirect',
        location,
      }, { status: 500 });
    }

    const phone = phoneMatch[1];
    const decodedText = decodeURIComponent(textMatch[1]);

    // Extract the activation code (B44-XXXXXXXX) for reporting back
    const codeMatch = decodedText.match(/B44-[A-Z0-9]{6,}/i);
    const activationCode = codeMatch ? codeMatch[0] : '';

    // Append the personal code on its own line
    const finalText = personalCode
      ? decodedText + '\n\nקוד אישי : ' + personalCode
      : decodedText;

    const link = `https://wa.me/${phone}?text=${encodeURIComponent(finalText)}`;

    return Response.json({
      link,
      phone,
      activation_code: activationCode,
      personal_code: personalCode,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
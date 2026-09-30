import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ensureClientPersonalCode } from '../../shared/userIdentification.ts';

// Builds a personal WhatsApp link for a single client that, when opened,
// starts a conversation with the expense_tracker agent.
//
// Each call to base44.agents.getWhatsAppConnectURL generates a fresh
// activation code (B44-XXXXXXXX) — so every user gets their OWN activation
// code. We follow the connect URL redirect to wa.me/<phone>?text=<msg>,
// decode the prepared message (which contains the activation code), append
// the client's personal 4-letter code on its own line, and rebuild a final
// wa.me link.
//
// Works for every client — including clients that registered but have never
// logged in (their record is AllowedUser).
//
// Payload: { user_id } or { email }  (admin / advisor / the client itself)
// Returns: { link, phone, activation_code, personal_code }
const emailOf = (value) => (value || '').toString().trim().toLowerCase();

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = caller.role === 'admin' || caller.user_type === 'admin';
    const isAdvisor = caller.user_type === 'advisor';
    if (!isAdmin && !isAdvisor && !caller.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: Record<string, any> = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const userId = (body.user_id || '').toString().trim();
    const emailInput = emailOf(body.email);
    if (!userId && !emailInput) {
      return Response.json({ error: 'user_id or email is required' }, { status: 400 });
    }

    // Resolve the client — from the app users, or from the registration record
    // of a client that has not logged in yet.
    let targetUser = userId
      ? (await base44.asServiceRole.entities.User.filter({ id: userId }))[0] || null
      : null;
    let targetEmail = emailOf(targetUser?.email) || emailInput;
    if (!targetEmail && userId) {
      const allowedById = await base44.asServiceRole.entities.AllowedUser.filter({ id: userId });
      targetEmail = emailOf(allowedById[0]?.email);
    }
    if (!targetEmail) return Response.json({ error: 'Client not found' }, { status: 404 });
    if (!targetUser) {
      targetUser = (await base44.asServiceRole.entities.User.filter({ email: targetEmail }))[0] || null;
    }

    // Admin: any client. Advisor: only own assigned clients. Client: self.
    const callerEmail = emailOf(caller.email);
    if (!isAdmin && callerEmail !== targetEmail) {
      let isMyClient = false;
      if (isAdvisor) {
        const assignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: targetEmail });
        isMyClient = assignments.some(a =>
          a.advisor_id === caller.id || emailOf(a.advisor_email) === callerEmail
        );
      }
      if (!isMyClient) {
        return Response.json({ error: 'Forbidden - not your client' }, { status: 403 });
      }
    }

    // Guarantee the personal code before building the link
    const ensured = await ensureClientPersonalCode(base44, { email: targetEmail });
    const personalCode = (ensured.personal_code || '').toUpperCase();

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
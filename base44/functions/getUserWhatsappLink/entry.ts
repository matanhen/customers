import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ensureClientPersonalCode } from '../../shared/userIdentification.ts';

// Returns a stable, shareable app link. The recipient signs in with their own
// account and opens the official WhatsApp connection from their browser.
// Never generate an activation code using an advisor's or admin's session.
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

    const link = `https://customers.matanhen.com/WhatsAppConnect?client=${encodeURIComponent(targetEmail)}`;
    return Response.json({
      link,
      personal_code: personalCode,
      requires_client_login: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
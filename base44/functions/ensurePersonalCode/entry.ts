import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ensureClientPersonalCode } from '../../shared/userIdentification.ts';

// Guarantees a personal code for a single client — called the moment a client
// registers (external webhook, "add client" in the advisor dashboard, "add user"
// in the admin dashboard) and on first login, so a code exists even for clients
// that have never opened the app.
//
// Payload: { email } or { user_id }
// Returns: { success, personal_code }
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: Record<string, any> = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (body.user_id || '').toString().trim();
    let email = (body.email || '').toString().toLowerCase().trim();
    if (!email && userId) {
      const found = await base44.asServiceRole.entities.User.filter({ id: userId });
      email = (found[0]?.email || '').toLowerCase().trim();
    }
    if (!email) return Response.json({ error: 'email or user_id is required' }, { status: 400 });

    // Admin: any client. Advisor: own assigned clients. Client: self.
    const callerEmail = (caller.email || '').toLowerCase().trim();
    const isAdmin = caller.role === 'admin' || caller.user_type === 'admin';
    let allowed = isAdmin || callerEmail === email;
    if (!allowed && caller.user_type === 'advisor') {
      const assignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: email });
      allowed = assignments.some(a =>
        a.advisor_id === caller.id || (a.advisor_email || '').toLowerCase().trim() === callerEmail
      );
    }
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const result = await ensureClientPersonalCode(base44, { email });
    return Response.json({ success: true, personal_code: result.personal_code || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
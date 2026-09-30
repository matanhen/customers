import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Returns the caller's assigned clients with full details (personal_code, phone, ...).
// Uses asServiceRole to bypass User RLS — advisors can't list User entities directly.
// - Admins: all clients.
// - Advisors: only their assigned clients (by ClientAdvisorAssignment).
// Clients that registered but never logged in are included as well, with the
// personal code stored on their registration record.
const LIST_LIMIT = 1000;
const emailOf = (value) => (value || '').toString().trim().toLowerCase();
const codeOf = (value) => (value || '').toString().trim().toUpperCase();

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = caller.role === 'admin' || caller.user_type === 'admin';
    const isAdvisor = caller.user_type === 'advisor';
    if (!isAdmin && !isAdvisor) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const callerEmail = emailOf(caller.email);

    const [allUsers, allAllowed, allAssignments] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', LIST_LIMIT),
      base44.asServiceRole.entities.AllowedUser.list('-created_date', LIST_LIMIT),
      base44.asServiceRole.entities.ClientAdvisorAssignment.list('-created_date', LIST_LIMIT),
    ]);

    const allowedByEmail = new Map(allAllowed.map(a => [emailOf(a.email), a]));
    const userById = new Map(allUsers.map(u => [u.id, u]));
    const userByEmail = new Map(allUsers.map(u => [emailOf(u.email), u]));

    let clients;
    if (isAdmin) {
      const registeredEmails = new Set(allUsers.map(u => emailOf(u.email)));
      clients = [
        ...allUsers.filter(u => u.user_type === 'client'),
        // registered clients that have not logged in yet
        ...allAllowed
          .filter(a => (a.user_type || 'client') === 'client' && !registeredEmails.has(emailOf(a.email)))
          .map(a => ({ email: a.email, full_name: a.full_name, phone: a.phone, personal_code: a.personal_code, user_type: 'client' })),
      ];
    } else {
      const myAssignments = allAssignments.filter(a =>
        a.advisor_id === caller.id || emailOf(a.advisor_email) === callerEmail
      );
      clients = myAssignments.map(a => {
        const email = emailOf(a.client_email);
        const user = (a.client_id && userById.get(a.client_id)) || userByEmail.get(email);
        if (user) return user;
        const allowed = allowedByEmail.get(email);
        if (allowed) return { email: allowed.email, full_name: allowed.full_name, phone: allowed.phone, personal_code: allowed.personal_code, user_type: 'client' };
        // Assignment without any registration record — still show the client
        return { email: a.client_email || '', full_name: a.client_name || '', user_type: 'client' };
      });
    }

    const seen = new Set();
    const clientList = [];
    for (const c of clients) {
      const email = emailOf(c.email);
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const allowed = allowedByEmail.get(email);
      clientList.push({
        id: c.id || '',
        email: c.email || '',
        full_name: c.custom_name || c.full_name || allowed?.full_name || '',
        custom_name: c.custom_name || '',
        phone: c.phone || allowed?.phone || '',
        personal_code: codeOf(c.personal_code) || codeOf(allowed?.personal_code),
        user_type: 'client',
      });
    }

    return Response.json({ clients: clientList });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
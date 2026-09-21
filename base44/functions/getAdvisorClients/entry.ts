import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns the caller's assigned clients with full user details (personal_code, phone, etc.).
// Uses asServiceRole to bypass User RLS — advisors can't list User entities directly.
// - Admins: get all clients.
// - Advisors: get only their assigned clients (by ClientAdvisorAssignment).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = caller.role === 'admin' || caller.user_type === 'admin';
    const isAdvisor = caller.user_type === 'advisor';
    if (!isAdmin && !isAdvisor) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Service role bypasses User RLS
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const allAssignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.list('-created_date', 500);

    let clients;
    if (isAdmin) {
      clients = allUsers.filter(u => u.user_type === 'client');
    } else {
      // Advisor: only their assigned clients
      const myAssignments = allAssignments.filter(a =>
        a.advisor_id === caller.id ||
        (a.advisor_email && a.advisor_email.toLowerCase() === (caller.email || '').toLowerCase())
      );
      const assignedIds = new Set(myAssignments.map(a => a.client_id).filter(Boolean));
      const assignedEmails = new Set(
        myAssignments.map(a => a.client_email?.toLowerCase()).filter(Boolean)
      );
      clients = allUsers.filter(u =>
        assignedIds.has(u.id) || assignedEmails.has((u.email || '').toLowerCase())
      );

      // Also include assigned clients not yet registered (from assignments only)
      const registeredEmails = new Set(allUsers.map(u => (u.email || '').toLowerCase()));
      const unregistered = myAssignments
        .filter(a => a.client_email && !registeredEmails.has(a.client_email.toLowerCase()))
        .map(a => ({
          id: '',
          email: a.client_email,
          full_name: a.client_name || '',
          custom_name: '',
          phone: '',
          personal_code: '',
          user_type: 'client',
          created_date: a.created_date,
        }));
      clients = [...clients, ...unregistered];
    }

    const clientList = clients.map(u => ({
      id: u.id || '',
      email: u.email || '',
      full_name: u.custom_name || u.full_name || '',
      custom_name: u.custom_name || '',
      phone: u.phone || '',
      personal_code: u.personal_code || '',
      user_type: u.user_type || 'client',
    }));

    return Response.json({ clients: clientList });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
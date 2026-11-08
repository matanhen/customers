// Groups clients by the advisor they are actually assigned to, using the live
// ClientAdvisorAssignment records and the real user records — never a fixed
// list of advisors. Admins are treated like any other assignee, so clients
// assigned to the system admin appear under the admin's name.
const emailKey = (value) => (value || '').toLowerCase().trim();

export const UNASSIGNED_KEY = 'unassigned';

function labelOf(advisor, fallbackEmail) {
  if (!advisor) return fallbackEmail || 'לא ידוע';
  return advisor.custom_name || advisor.full_name || advisor.email || fallbackEmail || 'לא ידוע';
}

export function buildAdvisorGroups({ clients = [], assignments = [], advisors = [] }) {
  const advisorById = new Map(advisors.filter(a => a.id).map(a => [a.id, a]));
  const advisorByEmail = new Map(advisors.filter(a => a.email).map(a => [emailKey(a.email), a]));
  const clientById = new Map(clients.filter(c => c.id).map(c => [c.id, c]));
  const clientByEmail = new Map(clients.filter(c => c.email).map(c => [emailKey(c.email), c]));

  // Only the most recent assignment of each client counts, so a stale
  // assignment never puts the same client under two advisors.
  const latestFirst = [...assignments].sort(
    (a, b) => new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0),
  );

  const groups = new Map();
  const assignedKeys = new Set();
  const groupFor = (key, advisor, fallbackEmail) => {
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: labelOf(advisor, fallbackEmail),
        email: advisor?.email || fallbackEmail || '',
        user_type: advisor?.user_type || '',
        clients: [],
      });
    } else if (advisor) {
      // A real user record always beats an email-only fallback
      const group = groups.get(key);
      group.name = labelOf(advisor, fallbackEmail);
      group.email = advisor.email || group.email;
      group.user_type = advisor.user_type || group.user_type;
    }
    return groups.get(key);
  };

  for (const assignment of latestFirst) {
    const clientKey = emailKey(assignment.client_email) || assignment.client_id;
    if (!clientKey || assignedKeys.has(clientKey)) continue;
    assignedKeys.add(clientKey);

    const advisor =
      (assignment.advisor_id && advisorById.get(assignment.advisor_id)) ||
      advisorByEmail.get(emailKey(assignment.advisor_email));
    const client =
      (assignment.client_id && clientById.get(assignment.client_id)) ||
      clientByEmail.get(emailKey(assignment.client_email));

    if (!client && !assignment.client_email) continue;
    const row = client || {
      id: '',
      email: assignment.client_email,
      full_name: assignment.client_name || '',
      custom_name: '',
      user_type: 'client',
    };

    // Key by email when possible: duplicate user records of the same person
    // then form one group instead of two with the same name.
    const advisorKey =
      emailKey(advisor?.email) || emailKey(assignment.advisor_email) || advisor?.id || assignment.advisor_id || 'unknown';
    groupFor(`advisor:${advisorKey}`, advisor, assignment.advisor_email).clients.push(row);
  }

  const unassigned = clients.filter(c => {
    const key = emailKey(c.email) || c.id;
    return key && !assignedKeys.has(key);
  });

  const list = [...groups.values()].sort((a, b) => b.clients.length - a.clients.length);
  if (unassigned.length > 0) {
    list.push({ key: UNASSIGNED_KEY, name: 'ללא יועץ', email: '', user_type: '', clients: unassigned });
  }
  return list;
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { identifyUser } from '../../shared/userIdentification.ts';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

// Returns meeting management context for the WhatsApp agent:
// - current user details
// - list of clients with phone numbers (for the advisor)
// - list of advisors (for admin)
// - upcoming meetings
// - meeting type and location options
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await identifyUser(base44, body);
    if (!user) return Response.json({ error: 'משתמש לא זוהה. אנא שלח קוד אישי.' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.user_type === 'admin';

    const allUsers = await base44.asServiceRole.entities.User.list();

    // Clients with phone numbers
    const clients = allUsers
      .filter(u => u.user_type === 'client' && u.phone)
      .map(u => ({
        id: u.id,
        name: u.custom_name || u.full_name || '',
        phone: normalizePhone(u.phone),
        email: u.email,
      }));

    // Advisors (for admin)
    const advisors = isAdmin
      ? allUsers
          .filter(u => u.user_type === 'advisor' || u.user_type === 'admin')
          .map(u => ({ id: u.id, name: u.custom_name || u.full_name || u.email }))
      : [];

    // Meetings: for advisors/admin, get meetings they're the advisor of.
    // For clients, get meetings where they are the client.
    const isClient = user.user_type === 'client';
    const meetings = isClient
      ? await base44.entities.Meeting.filter({ client_id: user.id })
      : await base44.entities.Meeting.filter({ advisor_id: user.id });

    // All scheduled meetings (not just future), sorted by date ascending
    const allScheduled = meetings
      .filter(m => m.status === 'scheduled')
      .sort((a, b) => new Date(a.meeting_date + 'T' + (a.meeting_time || '00:00')) - new Date(b.meeting_date + 'T' + (b.meeting_time || '00:00')));

    return Response.json({
      user: {
        id: user.id,
        name: user.custom_name || user.full_name || '',
        role: user.role,
        user_type: user.user_type,
      },
      is_admin: isAdmin,
      clients,
      advisors,
      upcoming_meetings: allScheduled.map(m => ({
        date: m.meeting_date,
        time: m.meeting_time,
        client_name: m.client_name,
        advisor_name: m.advisor_name,
        type: m.meeting_type === 'intro_call' ? 'שיחת היכרות' : 'פגישה',
        location: m.location_type === 'office' ? 'משרד' : m.location_type === 'zoom' ? 'זום' : 'ללא',
        status: m.status,
      })),
      meeting_types: [
        { value: 'intro_call', label: 'שיחת היכרות' },
        { value: 'meeting', label: 'פגישה' },
      ],
      meeting_statuses: [
        { value: 'scheduled', label: 'נקבעה' },
        { value: 'completed', label: 'התקיימה' },
        { value: 'no_show', label: 'הבריז/ה מפגישה' },
        { value: 'cancelled_client', label: 'נדחתה לבקשת הלקוח' },
        { value: 'cancelled_us', label: 'נדחתה לבקשתינו' },
      ],
      location_types: [
        { value: 'office', label: 'משרד', address: 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב' },
        { value: 'zoom', label: 'זום' },
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
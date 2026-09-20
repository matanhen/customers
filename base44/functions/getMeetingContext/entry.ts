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
        name: u.full_name || '',
        phone: normalizePhone(u.phone),
        email: u.email,
      }));

    // Advisors (for admin)
    const advisors = isAdmin
      ? allUsers
          .filter(u => u.user_type === 'advisor' || u.user_type === 'admin')
          .map(u => ({ id: u.id, name: u.full_name || u.email }))
      : [];

    // Upcoming meetings for this advisor
    const meetings = await base44.entities.Meeting.filter({ advisor_id: user.id });
    const now = new Date();
    const upcoming = meetings
      .filter(m => m.status === 'scheduled' && new Date(m.meeting_date + 'T' + (m.meeting_time || '00:00')) >= now)
      .sort((a, b) => new Date(a.meeting_date + 'T' + (a.meeting_time || '00:00')) - new Date(b.meeting_date + 'T' + (b.meeting_time || '00:00')))
      .slice(0, 10);

    return Response.json({
      user: {
        id: user.id,
        name: user.full_name || '',
        role: user.role,
        user_type: user.user_type,
      },
      is_admin: isAdmin,
      clients,
      advisors,
      upcoming_meetings: upcoming.map(m => ({
        date: m.meeting_date,
        time: m.meeting_time,
        client_name: m.client_name,
        type: m.meeting_type === 'intro_call' ? 'שיחת היכרות' : 'פגישה',
        location: m.location_type === 'office' ? 'משרד' : m.location_type === 'zoom' ? 'זום' : 'ללא',
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
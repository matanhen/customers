import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

// Creates a meeting from the WhatsApp bot. Called by the expense_tracker agent.
// The current user is the advisor or admin who sent the bot message.
//
// Params: client_phone, meeting_type ('intro_call'|'meeting'), meeting_date (YYYY-MM-DD),
//         meeting_time (HH:mm), location_type ('office'|'zoom'|'none'), advisor_name (optional, admin only)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { client_phone, meeting_type, meeting_date, meeting_time, location_type, advisor_name } = body;

    if (!client_phone || !meeting_date || !meeting_time) {
      return Response.json({ error: 'נדרשים: client_phone, meeting_date, meeting_time' }, { status: 400 });
    }

    if (!['intro_call', 'meeting'].includes(meeting_type)) {
      return Response.json({ error: 'סוג פגישה לא תקין (intro_call או meeting)' }, { status: 400 });
    }

    // Determine advisor
    let advisorId = user.id;
    let advisorName = user.full_name || user.email;
    let createdByType = 'advisor';

    const allUsers = await base44.asServiceRole.entities.User.list();

    // If admin is creating for another advisor (by name)
    if ((user.role === 'admin' || user.user_type === 'admin') && advisor_name) {
      const advisor = allUsers.find(u =>
        (u.full_name || '').includes(advisor_name) &&
        (u.user_type === 'advisor' || u.user_type === 'admin')
      );
      if (advisor) {
        advisorId = advisor.id;
        advisorName = advisor.full_name || advisor.email;
      }
      createdByType = 'admin';
    }

    // Find client by phone
    const targetPhone = normalizePhone(client_phone);
    const client = allUsers.find(u => {
      const uPhone = normalizePhone(u.phone);
      return uPhone && uPhone === targetPhone;
    });

    if (!client) {
      return Response.json({
        error: `לקוח עם מספר טלפון ${client_phone} לא נמצא במערכת. ודא שהמספר רשום אצל הלקוח במערכת.`
      }, { status: 404 });
    }

    // Determine location
    let finalLocationType = location_type || 'none';
    let address = '';

    if (meeting_type === 'intro_call') {
      finalLocationType = 'none';
      address = '';
    } else if (meeting_type === 'meeting') {
      if (finalLocationType === 'office') {
        address = OFFICE_ADDRESS;
      } else if (finalLocationType === 'zoom') {
        address = 'זום';
      } else {
        finalLocationType = 'none';
        address = '';
      }
    }

    // Create meeting
    const meeting = await base44.entities.Meeting.create({
      advisor_id: advisorId,
      advisor_name: advisorName,
      client_id: client.id,
      client_name: client.full_name || '',
      client_phone: client.phone || client_phone,
      meeting_type,
      meeting_date,
      meeting_time,
      location_type: finalLocationType,
      address,
      status: 'scheduled',
      created_by_id: user.id,
      created_by_type: createdByType,
    });

    // Format confirmation
    const typeLabel = meeting_type === 'intro_call' ? 'שיחת היכרות' : 'פגישה';
    let locationStr = '';
    if (finalLocationType === 'office') locationStr = ` במשרב - ${OFFICE_ADDRESS}`;
    else if (finalLocationType === 'zoom') locationStr = ' בזום';

    const confirmation = `נקבעה ${typeLabel} עם ${client.full_name || client.email} בתאריך ${meeting_date} בשעה ${meeting_time}${locationStr}.`;

    return Response.json({
      success: true,
      meeting_id: meeting.id,
      client_name: client.full_name || '',
      client_phone: client.phone || '',
      meeting_type,
      meeting_date,
      meeting_time,
      location_type: finalLocationType,
      address,
      confirmation,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
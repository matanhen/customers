import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Sends a WhatsApp notification to the client by finding their conversation
async function sendClientNotification(base44, phone, message) {
  try {
    if (!phone) return;
    const targetPhone = normalizePhone(phone);
    const conversations = await base44.agents.listConversations({ agent_name: 'expense_tracker' });
    let clientConversation = null;
    for (const conv of conversations) {
      const metadata = conv.metadata || {};
      const convPhone = normalizePhone(
        metadata.phone || metadata.whatsapp_phone || metadata.from || metadata.phone_number || metadata.phoneNumber || metadata.user_phone || ''
      );
      if (convPhone && convPhone === targetPhone) {
        clientConversation = conv;
        break;
      }
    }
    if (clientConversation) {
      await base44.agents.addMessage(clientConversation, {
        role: 'user',
        content: `[SYSTEM] ${message}`,
      });
    }
  } catch (e) {
    // Non-critical - meeting is still created even if notification fails
  }
}

// Creates a meeting from the WhatsApp bot. Called by the expense_tracker agent.
// The current user is the advisor or admin who sent the bot message.
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
      attendance_confirmed: false,
      reminder_72h_sent: false,
      reminder_day_of_sent: false,
      follow_up_sent: false,
      created_by_id: user.id,
      created_by_type: createdByType,
    });

    // Format location string for messages
    const locationStr = finalLocationType === 'office' ? `משרד (${OFFICE_ADDRESS})`
      : finalLocationType === 'zoom' ? 'זום'
      : '';
    const typeLabel = meeting_type === 'intro_call' ? 'שיחת היכרות' : 'פגישה';
    const dateStr = formatDate(meeting_date);

    // Send notification to the client
    const clientLocationStr = finalLocationType === 'office' ? `משרד (${OFFICE_ADDRESS})`
      : finalLocationType === 'zoom' ? 'זום'
      : '';
    const clientMessage = `הפגישה עם ${advisorName} נקבעה בהצלחה 👏🏼\n* *תאריך:* ${dateStr}\n* *שעה:* ${meeting_time}${clientLocationStr ? `\n* *מיקום:* ${clientLocationStr}` : ''}\n\nבמידה ויש שינוי כלשהו, יש להודיע לפחות 24 שעות מראש. במידה ולא הפגישה תיחשב כהתקיימה.\nאשמח לקבל ממך אישור הגעה כאן בהודעה 📥`;

    await sendClientNotification(base44, client.phone || client_phone, clientMessage);

    // If admin created for another advisor, notify the advisor too
    if (createdByType === 'admin' && advisorId !== user.id) {
      const advisor = allUsers.find(u => u.id === advisorId);
      if (advisor && advisor.phone) {
        const advisorMessage = `נקבעה עבורך פגישה חדשה עם ${client.full_name || ''} 👏🏼\n* *תאריך:* ${dateStr}\n* *שעה:* ${meeting_time}\n* *סוג:* ${typeLabel}${locationStr ? `\n* *מיקום:* ${locationStr}` : ''}`;
        await sendClientNotification(base44, advisor.phone, advisorMessage);
      }
    }

    // Send webhook based on meeting type
    const meetingDatetime = `${meeting_date}T${meeting_time}:00`;
    const webhookPayload = {
      guest_phone: client.phone || client_phone,
      advisor_name: advisorName,
      meeting_datetime: meetingDatetime,
    };

    try {
      if (meeting_type === 'intro_call') {
        await fetch('https://hook.eu2.make.com/q3ywke7jenm2ib1rl7qnuflnft8pjnfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });
      } else if (meeting_type === 'meeting') {
        webhookPayload.location = finalLocationType === 'office' ? 'office' : 'zoom';
        await fetch('https://hook.eu2.make.com/15q5eau4jwbsm7rsaaijek8xkwaj4z4c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });
      }
    } catch (e) {
      // Non-critical
    }

    // Build advisor confirmation in the new format
    const confirmation = `הפגישה עם ${client.full_name || client.email} נקבעה בהצלחה👏🏼\n* *תאריך:* ${dateStr}\n* *שעה:* ${meeting_time}\n* *סוג:* ${typeLabel}${locationStr ? `\n* *מיקום:* ${locationStr}` : ''}`;

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
      client_notified: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
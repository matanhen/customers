import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendWhatsappNotification } from '../../shared/whatsappNotification.ts';

function toInternational(p: string): string {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '972' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = cleaned;
  else if (cleaned.startsWith('0')) cleaned = '972' + cleaned.slice(1);
  return cleaned;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

// Sends a WhatsApp message to a client via the expense_tracker agent.
// Can be called with either:
// - meeting_id: looks up the meeting, constructs the confirmation message, and sends it
// - client_phone + message_text: sends a custom message directly
// client_name is NOT required — the client is identified by phone number alone.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { meeting_id, client_phone, message_text } = body;

    let phone = client_phone || '';
    let message = message_text || '';

    // If meeting_id is provided, look up the meeting and construct the message
    if (meeting_id) {
      try {
        const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
        phone = meeting.client_phone || '';

        const locationStr = meeting.location_type === 'office' ? `משרד (${OFFICE_ADDRESS})`
          : meeting.location_type === 'zoom' ? 'זום'
          : '';
        const dateStr = formatDate(meeting.meeting_date);

        message = `הפגישה עם ${meeting.advisor_name} נקבעה בהצלחה 👏🏼\n* *תאריך:* ${dateStr}\n* *שעה:* ${meeting.meeting_time}${locationStr ? `\n* *מיקום:* ${locationStr}` : ''}\n\nבמידה ויש שינוי כלשהו, יש להודיע לפחות 24 שעות מראש. במידה ולא הפגישה תיחשב כהתקיימה.\nאשמח לקבל ממך אישור הגעה כאן בהודעה 📥`;
      } catch (e) {
        return Response.json({ error: 'פגישה לא נמצאה: ' + e.message }, { status: 404 });
      }
    }

    if (!phone || !message) {
      return Response.json({ error: 'נדרשים: meeting_id או (client_phone + message_text)' }, { status: 400 });
    }

    const internationalPhone = toInternational(phone);

    // Look up the user by phone number to get their personal code and name
    let personal_code = '';
    let client_name = '';
    let client_email = '';
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const user = allUsers.find(u => {
        const uPhone = toInternational(u.phone);
        return uPhone && uPhone === internationalPhone;
      });
      if (user) {
        personal_code = user.personal_code || '';
        client_name = user.custom_name || user.full_name || '';
        client_email = user.email || '';
      }
    } catch (e) { /* non-critical */ }

    const result = await sendWhatsappNotification(base44, phone, message, {
      name: client_name,
      email: client_email,
    });

    return Response.json({ ...result, personal_code, client_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
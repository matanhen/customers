import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { identifyUser } from '../../shared/userIdentification.ts';
import { sendWhatsappNotification } from '../../shared/whatsappNotification.ts';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '972' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = cleaned;
  else if (cleaned.startsWith('0')) cleaned = '972' + cleaned.slice(1);
  return cleaned;
}

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Updates details of an existing meeting (date, time, location, type).
// Called by the expense_tracker agent when an advisor/admin requests a change.
// Clients cannot use this function (RLS on Meeting.update blocks them).
// Params: client_phone, current_meeting_date (optional YYYY-MM-DD to identify),
//         new_date, new_time, new_location_type, new_meeting_type
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await identifyUser(base44, body);
    if (!user) return Response.json({ error: 'משתמש לא זוהה. אנא שלח קוד אישי.' }, { status: 401 });

    // Only advisors and admins can edit meetings
    if (user.user_type !== 'advisor' && user.user_type !== 'admin' && user.role !== 'admin') {
      return Response.json({ error: 'אין הרשאה - רק יועץ או מנהל יכול לערוך פגישות' }, { status: 403 });
    }

    const { client_phone, current_meeting_date, new_date, new_time, new_location_type, new_meeting_type } = body;

    if (!client_phone) {
      return Response.json({ error: 'נדרש: client_phone' }, { status: 400 });
    }

    // Find meetings for this advisor (RLS filters to user's meetings)
    const meetings = await base44.entities.Meeting.filter({ advisor_id: user.id });
    const targetPhone = normalizePhone(client_phone);

    let matching = meetings.filter(m => normalizePhone(m.client_phone) === targetPhone);

    if (matching.length === 0) {
      return Response.json({ error: `לא נמצאה פגישה עם לקוח במספר ${client_phone}` }, { status: 404 });
    }

    // If current_meeting_date provided, filter by date
    if (current_meeting_date) {
      const dateMatched = matching.filter(m => m.meeting_date === current_meeting_date);
      if (dateMatched.length > 0) matching = dateMatched;
    }

    // Pick most recent
    if (matching.length > 1) {
      matching.sort((a, b) => new Date(b.meeting_date + 'T' + (b.meeting_time || '00:00')) - new Date(a.meeting_date + 'T' + (a.meeting_time || '00:00')));
    }

    const targetMeeting = matching[0];

    // Build update data
    const updateData = {};
    if (new_date) updateData.meeting_date = new_date;
    if (new_time) updateData.meeting_time = new_time;

    if (new_meeting_type && ['intro_call', 'meeting'].includes(new_meeting_type)) {
      updateData.meeting_type = new_meeting_type;
      // If changed to intro_call, clear location
      if (new_meeting_type === 'intro_call') {
        updateData.location_type = 'none';
        updateData.address = '';
      }
    }

    if (new_location_type && ['office', 'zoom', 'none'].includes(new_location_type)) {
      // Only apply location if meeting type is meeting (not intro_call)
      const effectiveType = new_meeting_type || targetMeeting.meeting_type;
      if (effectiveType === 'meeting') {
        updateData.location_type = new_location_type;
        updateData.address = new_location_type === 'office' ? OFFICE_ADDRESS : new_location_type === 'zoom' ? 'זום' : '';
      }
    }

    await base44.entities.Meeting.update(targetMeeting.id, updateData);

    // Build confirmation message
    const finalDate = updateData.meeting_date || targetMeeting.meeting_date;
    const finalTime = updateData.meeting_time || targetMeeting.meeting_time;
    const finalType = updateData.meeting_type || targetMeeting.meeting_type;
    const finalLocation = updateData.location_type || targetMeeting.location_type;

    const typeLabel = finalType === 'intro_call' ? 'שיחת היכרות' : 'פגישה';
    let locationStr = '';
    if (finalLocation === 'office') locationStr = `משרד (${OFFICE_ADDRESS})`;
    else if (finalLocation === 'zoom') locationStr = 'זום';

    const changes = [];
    if (updateData.meeting_date) changes.push('תאריך');
    if (updateData.meeting_time) changes.push('שעה');
    if (updateData.meeting_type) changes.push('סוג');
    if (updateData.location_type) changes.push('מיקום');

    // Send WhatsApp notification to the client about the update
    let clientNotificationResult = null;
    if (changes.length > 0 && targetMeeting.client_phone) {
      const clientMessage = `עדכון פרטי פגישה:\n* *תאריך:* ${formatDate(finalDate)}\n* *שעה:* ${finalTime}\n* *סוג:* ${typeLabel}${locationStr ? `\n* *מיקום:* ${locationStr}` : ''}\n\nבמידה ויש שינוי כלשהו, יש להודיע לפחות 24 שעות מראש.`;
      clientNotificationResult = await sendWhatsappNotification(base44, targetMeeting.client_phone, clientMessage, {
        name: targetMeeting.client_name || '',
      });
    }

    const confirmation = `פרטי הפגישה עם ${targetMeeting.client_name} עודכנו בהצלחה.\n* *תאריך:* ${formatDate(finalDate)}\n* *שעה:* ${finalTime}\n* *סוג:* ${typeLabel}${locationStr ? `\n* *מיקום:* ${locationStr}` : ''}`;

    return Response.json({
      success: true,
      meeting_id: targetMeeting.id,
      client_name: targetMeeting.client_name,
      changes: changes.join(', '),
      confirmation,
      client_notified: clientNotificationResult?.success || false,
      client_notification_method: clientNotificationResult?.method || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
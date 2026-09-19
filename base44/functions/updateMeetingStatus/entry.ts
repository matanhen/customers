import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

const STATUS_LABELS = {
  scheduled: 'נקבעה',
  completed: 'התקיימה',
  no_show: 'הבריז/ה מפגישה',
  cancelled_client: 'נדחתה לבקשת הלקוח',
  cancelled_us: 'נדחתה לבקשתינו',
};

// Updates the status of an existing meeting.
// Called by the expense_tracker agent when a user sends a status update message.
// Params: client_phone, status, meeting_date (optional YYYY-MM-DD)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { client_phone, meeting_date, status } = body;

    if (!client_phone || !status) {
      return Response.json({ error: 'נדרשים: client_phone, status' }, { status: 400 });
    }

    const validStatuses = ['scheduled', 'completed', 'no_show', 'cancelled_client', 'cancelled_us'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'סטטוס לא תקין. אפשרויות: scheduled, completed, no_show, cancelled_client, cancelled_us' }, { status: 400 });
    }

    // Find meetings for this advisor (RLS filters to user's meetings)
    const meetings = await base44.entities.Meeting.filter({ advisor_id: user.id });
    const targetPhone = normalizePhone(client_phone);

    let matching = meetings.filter(m => normalizePhone(m.client_phone) === targetPhone);

    if (matching.length === 0) {
      return Response.json({
        error: `לא נמצאה פגישה עם לקוח במספר ${client_phone}` + (meeting_date ? ` בתאריך ${meeting_date}` : '')
      }, { status: 404 });
    }

    // If meeting_date provided, filter by date
    if (meeting_date) {
      const dateMatched = matching.filter(m => m.meeting_date === meeting_date);
      if (dateMatched.length > 0) {
        matching = dateMatched;
      }
    }

    // If multiple matches, pick the most recent upcoming or recent past
    if (matching.length > 1) {
      matching.sort((a, b) => {
        const da = new Date(a.meeting_date + 'T' + (a.meeting_time || '00:00'));
        const db = new Date(b.meeting_date + 'T' + (b.meeting_time || '00:00'));
        return db - da; // most recent first
      });
    }

    const targetMeeting = matching[0];
    const oldStatus = targetMeeting.status;

    await base44.entities.Meeting.update(targetMeeting.id, { status });

    return Response.json({
      success: true,
      meeting_id: targetMeeting.id,
      client_name: targetMeeting.client_name,
      meeting_date: targetMeeting.meeting_date,
      meeting_time: targetMeeting.meeting_time,
      old_status: oldStatus,
      new_status: status,
      confirmation: `סטטוס הפגישה עם ${targetMeeting.client_name} בתאריך ${targetMeeting.meeting_date} עודכן ל: ${STATUS_LABELS[status]}.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
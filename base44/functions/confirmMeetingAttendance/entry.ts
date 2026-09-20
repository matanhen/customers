import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { identifyUser } from '../../shared/userIdentification.ts';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

// Confirms attendance for a meeting. Called when a client confirms via WhatsApp.
// The client is identified by their phone number (the current user).
// Params: meeting_date (optional YYYY-MM-DD to identify which meeting)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await identifyUser(base44, body);
    if (!user) return Response.json({ error: 'משתמש לא זוהה. אנא שלח קוד אישי.' }, { status: 401 });

    const { meeting_date } = body;

    // Find meetings where the current user is the client
    const meetings = await base44.entities.Meeting.filter({ client_id: user.id });

    // Filter to scheduled meetings only
    let matching = meetings.filter(m => m.status === 'scheduled');

    if (matching.length === 0) {
      return Response.json({ error: 'לא נמצאו פגישות פעילות עבורך' }, { status: 404 });
    }

    // If meeting_date provided, filter by date
    if (meeting_date) {
      const dateMatched = matching.filter(m => m.meeting_date === meeting_date);
      if (dateMatched.length > 0) matching = dateMatched;
    }

    // Pick the most recent upcoming meeting
    matching.sort((a, b) => {
      const da = new Date(a.meeting_date + 'T' + (a.meeting_time || '00:00'));
      const db = new Date(b.meeting_date + 'T' + (b.meeting_time || '00:00'));
      return da - db; // soonest first
    });

    // Filter to upcoming meetings
    const now = new Date();
    const upcoming = matching.filter(m => new Date(m.meeting_date + 'T' + (m.meeting_time || '00:00')) >= now);

    const targetMeeting = upcoming.length > 0 ? upcoming[0] : matching[0];

    await base44.entities.Meeting.update(targetMeeting.id, { attendance_confirmed: true });

    return Response.json({
      success: true,
      meeting_id: targetMeeting.id,
      client_name: targetMeeting.client_name,
      meeting_date: targetMeeting.meeting_date,
      meeting_time: targetMeeting.meeting_time,
      confirmation: 'אישור ההגעה התקבל בהצלחה ✅',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
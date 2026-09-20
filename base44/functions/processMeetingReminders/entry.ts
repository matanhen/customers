import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendWhatsappNotification } from '../../shared/whatsappNotification.ts';

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

// Processes all scheduled meetings and sends reminders as needed:
// - 72h reminder: 3 days before the meeting
// - Day-of reminder: at 8:00 AM on the meeting day
// - 48h follow-up: 48 hours after creation if not confirmed
// Called by a scheduled workflow every hour.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Get all scheduled meetings (asServiceRole to bypass RLS)
    const meetings = await base44.asServiceRole.entities.Meeting.filter({ status: 'scheduled' });
    const now = new Date();

    let sent72h = 0, sentDayOf = 0, sentFollowUp = 0;
    let errors = [];

    for (const m of meetings) {
      if (!m.client_phone) continue;

      const meetingDateTime = new Date(m.meeting_date + 'T' + (m.meeting_time || '00:00'));
      const createdDate = new Date(m.created_date);
      const hoursUntilMeeting = (meetingDateTime - now) / (1000 * 60 * 60);
      const hoursSinceCreation = (now - createdDate) / (1000 * 60 * 60);

      const locationStr = m.location_type === 'office' ? 'במשרד' : m.location_type === 'zoom' ? 'בזום' : '';

      // 72h reminder: meeting is within 72-73h from now (within the next hour window)
      if (!m.reminder_72h_sent && hoursUntilMeeting <= 72 && hoursUntilMeeting > 71) {
        const message = `היי!\nמזכיר שיש לך פגישה עוד 3 ימים בשעה ${m.meeting_time} ${locationStr}`;
        const result = await sendWhatsappNotification(base44, m.client_phone, message, { name: m.client_name || '' });
        if (result.success) {
          await base44.asServiceRole.entities.Meeting.update(m.id, { reminder_72h_sent: true });
          sent72h++;
        } else {
          errors.push({ meeting_id: m.id, type: '72h', error: result.error });
        }
      }

      // Day-of reminder: meeting is today, current time is 8:00-9:00 AM (Jerusalem time)
      const jerusalemDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(now);
      const jerusalemHour = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        hour: 'numeric', hour12: false
      }).format(now));
      if (!m.reminder_day_of_sent && m.meeting_date === jerusalemDateStr && jerusalemHour >= 8 && jerusalemHour < 9) {
        const message = `היי!\nמזכיר שיש לך פגישה היום בשעה ${m.meeting_time} ${locationStr}\nנתראה! 🥳`;
        const result = await sendWhatsappNotification(base44, m.client_phone, message, { name: m.client_name || '' });
        if (result.success) {
          await base44.asServiceRole.entities.Meeting.update(m.id, { reminder_day_of_sent: true });
          sentDayOf++;
        } else {
          errors.push({ meeting_id: m.id, type: 'day_of', error: result.error });
        }
      }

      // 48h follow-up: created 48-49h ago, not confirmed, follow-up not sent, and meeting hasn't passed
      if (!m.follow_up_sent && !m.attendance_confirmed && hoursSinceCreation >= 48 && hoursSinceCreation < 49 && meetingDateTime > now) {
        const message = `היי, עדיין לא אישרת הגעה לפגישה שלך. אשמח לקבל ממך אישור הגעה.`;
        const result = await sendWhatsappNotification(base44, m.client_phone, message, { name: m.client_name || '' });
        if (result.success) {
          await base44.asServiceRole.entities.Meeting.update(m.id, { follow_up_sent: true });
          sentFollowUp++;
        } else {
          errors.push({ meeting_id: m.id, type: 'follow_up', error: result.error });
        }
      }
    }

    return Response.json({ 
      success: true, 
      processed: meetings.length,
      sent_72h: sent72h, 
      sent_day_of: sentDayOf, 
      sent_follow_up: sentFollowUp,
      errors 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
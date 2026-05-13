import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Generate an iCalendar event string
function generateICS({ uid, summary, description, location, dtStart, dtEnd, organizerEmail, organizerName, attendeeEmail, attendeeName }) {
  const formatDate = (dateStr, timeStr) => {
    // dateStr: YYYY-MM-DD, timeStr: HH:MM
    return dateStr.replace(/-/g, '') + 'T' + timeStr.replace(':', '') + '00';
  };

  const start = formatDate(dtStart.date, dtStart.time);
  const end = formatDate(dtEnd.date, dtEnd.time);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tzeirim Mitasharim//Appointments//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Asia/Jerusalem:${start}`,
    `DTEND;TZID=Asia/Jerusalem:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
    `ATTENDEE;CN=${attendeeName};RSVP=TRUE:mailto:${attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Format Hebrew date for display
function formatHebrewDate(dateStr) {
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day)} ב${months[parseInt(month) - 1]} ${year}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { appointmentId } = await req.json();

    // Fetch the appointment
    const appointment = await base44.asServiceRole.entities.Appointment.get(appointmentId);
    if (!appointment) {
      return Response.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Fetch advisor and client users
    const [advisorUsers, clientUsers] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ id: appointment.advisor_id }),
      base44.asServiceRole.entities.User.filter({ id: appointment.client_id }),
    ]);

    const advisor = advisorUsers[0];
    const client = clientUsers[0];

    if (!advisor || !client) {
      return Response.json({ error: 'Could not find advisor or client' }, { status: 404 });
    }

    const locationText = appointment.location_type === 'zoom' ? 'פגישת זום (הקישור ישלח בנפרד)' : 'משרד היועץ';
    const uid = `appointment-${appointment.id}@tzeirim-mitasharim`;

    const icsContent = generateICS({
      uid,
      summary: `פגישת ייעוץ פיננסי - ${client.full_name || client.email}`,
      description: `פגישת ייעוץ פיננסי בין ${advisor.full_name || advisor.email} ל${client.full_name || client.email}`,
      location: locationText,
      dtStart: { date: appointment.date, time: appointment.start_time },
      dtEnd: { date: appointment.date, time: appointment.end_time },
      organizerEmail: advisor.email,
      organizerName: advisor.full_name || advisor.email,
      attendeeEmail: client.email,
      attendeeName: client.full_name || client.email,
    });

    const hebrewDate = formatHebrewDate(appointment.date);
    const locationLabel = appointment.location_type === 'zoom' ? 'זום' : 'משרד';

    const emailBody = (recipientName, role) => `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #105330, #1a7a4a); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ פגישה נקבעה בהצלחה</h1>
  </div>
  <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0;">
    <p style="font-size: 16px; color: #333;">שלום ${recipientName},</p>
    <p style="color: #555;">פגישת ייעוץ פיננסי נקבעה ${role === 'advisor' ? 'עם הלקוח ' + (client.full_name || client.email) : 'עם היועץ ' + (advisor.full_name || advisor.email)}.</p>
    
    <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #105330;">
      <h2 style="color: #105330; margin-top: 0;">פרטי הפגישה</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 40%;">📅 תאריך:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${hebrewDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">🕐 שעה:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${appointment.start_time} - ${appointment.end_time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">📍 סוג:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${locationLabel === 'זום' ? '💻 פגישת זום' : '🏢 פגישה במשרד'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">${role === 'advisor' ? '👤 לקוח:' : '👔 יועץ:'}</td>
          <td style="padding: 8px 0; font-weight: bold; color: #333;">${role === 'advisor' ? (client.full_name || client.email) : (advisor.full_name || advisor.email)}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #888; font-size: 13px;">📎 מצורף לאימייל זה קובץ זימון (.ics) — לחץ עליו כדי להוסיף את הפגישה ישירות ליומן שלך.</p>
    
    <p style="color: #555; font-size: 13px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
      <strong>מדיניות ביטול:</strong> ניתן לבטל פגישה עד 24 שעות לפני מועדה דרך האפליקציה.
    </p>
  </div>
</div>`;

    // Send email to both with ICS attachment via base64
    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)));

    // Send to advisor
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: advisor.email,
      subject: `📅 פגישה נקבעה - ${client.full_name || client.email} | ${hebrewDate}`,
      body: emailBody(advisor.full_name || advisor.email, 'advisor'),
    });

    // Send to client
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: client.email,
      subject: `📅 פגישה נקבעה - ${hebrewDate} | ${appointment.start_time}`,
      body: emailBody(client.full_name || client.email, 'client'),
    });

    return Response.json({ success: true, advisorEmail: advisor.email, clientEmail: client.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
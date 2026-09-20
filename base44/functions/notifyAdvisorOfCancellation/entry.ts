import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

async function sendAdvisorNotification(base44, phone, message) {
  try {
    if (!phone) return;
    const targetPhone = normalizePhone(phone);
    const conversations = await base44.agents.listConversations({ agent_name: 'expense_tracker' });
    let advisorConversation = null;
    for (const conv of conversations) {
      const metadata = conv.metadata || {};
      const convPhone = normalizePhone(
        metadata.phone || metadata.whatsapp_phone || metadata.from || metadata.phone_number || metadata.phoneNumber || metadata.user_phone || ''
      );
      if (convPhone && convPhone === targetPhone) {
        advisorConversation = conv;
        break;
      }
    }
    if (advisorConversation) {
      await base44.agents.addMessage(advisorConversation, {
        role: 'user',
        content: `[SYSTEM] ${message}`,
      });
    }
  } catch (e) {
    // Non-critical
  }
}

// Called by the WhatsApp agent when a client requests to reschedule/cancel
// or says they can't make it to a meeting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { client_phone, client_message, client_name } = body;

    if (!client_phone) {
      return Response.json({ error: 'נדרש client_phone' }, { status: 400 });
    }

    const targetPhone = normalizePhone(client_phone);
    const users = await base44.asServiceRole.entities.User.list();
    const client = users.find(u => normalizePhone(u.phone) === targetPhone);

    if (!client) {
      return Response.json({ error: 'לקוח לא נמצא' }, { status: 404 });
    }

    // Find advisor from ClientAdvisorAssignment
    const assignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_id: client.id });
    if (assignments.length === 0) {
      return Response.json({ error: 'לא נמצא יועץ משויך ללקוח' }, { status: 404 });
    }

    const advisorId = assignments[0].advisor_id;
    const advisor = users.find(u => u.id === advisorId);

    if (!advisor || !advisor.phone) {
      return Response.json({ error: 'יועץ לא נמצא או אין לו מספר טלפון' }, { status: 404 });
    }

    const clientDisplayName = client_name || client.full_name || client.email || client_phone;
    const advisorMessage = `⚠️ הלקוח ${clientDisplayName} (טלפון: ${client_phone}) מבקש לדחות/בטל את הפגישה.\n\nתוכן ההודעה מהלקוח:\n"${client_message}"\n\nנא ליצור קשר עם הלקוח לתיאום מחדש.`;

    await sendAdvisorNotification(base44, advisor.phone, advisorMessage);

    return Response.json({
      success: true,
      advisor_name: advisor.full_name || advisor.email,
      advisor_phone: advisor.phone,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
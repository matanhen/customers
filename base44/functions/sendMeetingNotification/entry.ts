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

// Sends a WhatsApp message to a client via the expense_tracker agent.
// Params: client_phone, message_text, client_name (optional)
// Identifies the client name from meeting details (by phone) if not provided.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { client_phone, message_text } = body;

    if (!client_phone || !message_text) {
      return Response.json({ error: 'נדרשים: client_phone, message_text' }, { status: 400 });
    }

    // Identify the client name from meeting details (by phone number)
    let client_name = body.client_name || '';
    if (!client_name) {
      const internationalPhone = toInternational(client_phone);
      try {
        const meetings = await base44.asServiceRole.entities.Meeting.filter({ client_phone: internationalPhone });
        if (meetings.length > 0) {
          client_name = meetings[0].client_name || '';
        }
      } catch (e) { /* non-critical */ }
    }

    const result = await sendWhatsappNotification(base44, client_phone, message_text, { name: client_name });

    return Response.json({ ...result, client_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
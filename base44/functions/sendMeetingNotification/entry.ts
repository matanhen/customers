import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendWhatsappNotification } from '../../shared/whatsappNotification.ts';

// Sends a WhatsApp message to a client via the expense_tracker agent.
// Params: client_phone, message_text
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { client_phone, message_text } = body;

    if (!client_phone || !message_text) {
      return Response.json({ error: 'נדרשים: client_phone, message_text' }, { status: 400 });
    }

    const result = await sendWhatsappNotification(base44, client_phone, message_text);

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
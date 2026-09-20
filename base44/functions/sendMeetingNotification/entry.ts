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
// Params: client_phone (required), message_text (required)
// client_name is NOT required — the client is identified by phone number alone.
// Looks up the user by phone to retrieve their personal code and name (for metadata).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { client_phone, message_text } = body;

    if (!client_phone || !message_text) {
      return Response.json({ error: 'נדרשים: client_phone, message_text' }, { status: 400 });
    }

    const internationalPhone = toInternational(client_phone);

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

    const result = await sendWhatsappNotification(base44, client_phone, message_text, {
      name: client_name,
      email: client_email,
    });

    return Response.json({ ...result, personal_code, client_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
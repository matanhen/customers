import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveWhatsappConnect } from '../../shared/whatsappConnect.ts';

// Returns the WhatsApp agent's phone number and a FRESH activation code.
// The code is one-time, so it is never stored — only used for display.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const { phone, activationCode } = await resolveWhatsappConnect(base44);

    if (!phone) {
      return Response.json({ error: 'Could not detect the WhatsApp number' }, { status: 500 });
    }

    // Keep the cached number in sync with the live one
    try {
      const existing = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'whatsapp_bot_phone' });
      if (existing[0]?.value !== phone) {
        if (existing[0]) {
          await base44.asServiceRole.entities.SiteSettings.update(existing[0].id, { value: phone });
        } else {
          await base44.asServiceRole.entities.SiteSettings.create({ key: 'whatsapp_bot_phone', value: phone });
        }
      }
    } catch (e) { /* non-critical */ }

    return Response.json({ phone, activation_code: activationCode, source: activationCode ? 'live' : 'cached' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
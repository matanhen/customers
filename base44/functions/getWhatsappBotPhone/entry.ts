import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Auto-detects the WhatsApp agent's phone number by following the
// WhatsApp connect URL redirect (which points to wa.me/<phone>).
// Caches the result in SiteSettings so we don't fetch every time.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Check if already cached in SiteSettings
    const existing = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'whatsapp_bot_phone' });
    if (existing[0]?.value) {
      return Response.json({ phone: existing[0].value, source: 'cached' });
    }

    // Get the connect URL — this returns a base44.app URL that redirects to wa.me/<phone>
    let connectUrl: string;
    try {
      connectUrl = base44.agents.getWhatsAppConnectURL('expense_tracker');
    } catch (e) {
      return Response.json({ error: 'Could not get connect URL' }, { status: 500 });
    }

    // Follow the redirect to get the wa.me URL
    const resp = await fetch(connectUrl, { redirect: 'manual' });
    const location = resp.headers.get('location') || '';

    // Extract phone from wa.me/<phone>?text=...
    const match = location.match(/wa\.me\/(\d+)/);
    if (match) {
      const phone = match[1];
      // Cache it in SiteSettings
      try {
        await base44.asServiceRole.entities.SiteSettings.create({
          key: 'whatsapp_bot_phone',
          value: phone,
        });
      } catch (e) { /* might already exist — ignore */ }
      return Response.json({ phone, source: 'detected' });
    }

    return Response.json({ error: 'Could not detect phone from redirect', location }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
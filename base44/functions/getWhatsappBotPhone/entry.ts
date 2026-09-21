import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Auto-detects the WhatsApp agent's phone number AND activation code by
// following the WhatsApp connect URL redirect (which points to
// wa.me/<phone>?text=<activation message containing B44-XXXXXXXX>).
// Caches both in SiteSettings so we don't fetch every time.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Check if already cached in SiteSettings
    const existing = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'whatsapp_bot_phone' });
    const existingCode = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'whatsapp_activation_code' });

    const cachedPhone = existing[0]?.value;
    const cachedCode = existingCode[0]?.value;

    if (cachedPhone && cachedCode) {
      return Response.json({ phone: cachedPhone, activation_code: cachedCode, source: 'cached' });
    }

    // Get the connect URL — this returns a base44.app URL that redirects to wa.me/<phone>?text=...
    let connectUrl: string;
    try {
      connectUrl = base44.agents.getWhatsAppConnectURL('expense_tracker');
    } catch (e) {
      return Response.json({ error: 'Could not get connect URL' }, { status: 500 });
    }

    // Follow the redirect to get the wa.me URL with text parameter
    const resp = await fetch(connectUrl, { redirect: 'manual' });
    const location = resp.headers.get('location') || '';

    // Extract phone from wa.me/<phone>?text=...
    const phoneMatch = location.match(/wa\.me\/(\d+)/);
    // Extract text parameter (URL-encoded activation message)
    const textMatch = location.match(/[?&]text=([^&]+)/);

    let phone = cachedPhone || '';
    let activationCode = cachedCode || '';

    if (phoneMatch) {
      phone = phoneMatch[1];
    }

    if (textMatch) {
      // Decode the text parameter and extract the B44-XXXXXXXX code
      const decodedText = decodeURIComponent(textMatch[1]);
      const codeMatch = decodedText.match(/B44-[A-Z0-9]{6,}/i);
      if (codeMatch) {
        activationCode = codeMatch[0];
      }
    }

    // Cache phone if newly detected
    if (phone && !cachedPhone) {
      try {
        await base44.asServiceRole.entities.SiteSettings.create({
          key: 'whatsapp_bot_phone',
          value: phone,
        });
      } catch (e) { /* might already exist — ignore */ }
    }

    // Cache activation code if newly detected
    if (activationCode && !cachedCode) {
      try {
        await base44.asServiceRole.entities.SiteSettings.create({
          key: 'whatsapp_activation_code',
          value: activationCode,
        });
      } catch (e) { /* might already exist — ignore */ }
    }

    if (phone && activationCode) {
      return Response.json({ phone, activation_code: activationCode, source: 'detected' });
    }

    return Response.json({
      error: 'Could not detect phone or activation code from redirect',
      location,
      phone,
      activationCode
    }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
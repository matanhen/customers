import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Resolves the WhatsApp agent's phone number AND a FRESH activation code by
// following the WhatsApp connect URL redirect (which points to
// wa.me/<phone>?text=<activation message containing B44-XXXXXXXX>).
//
// The activation code is ONE-TIME: every generated connect link carries a new
// B44- code, and once its message is used (or a newer link is generated) the
// old code is no longer recognized by the Base44 WhatsApp bot. Re-sending an
// old opening message is exactly what produces "app not found". So the code is
// never stored: it is resolved fresh here and only used for display/diagnostics.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const existingPhone = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'whatsapp_bot_phone' });
    const cachedPhone = existingPhone[0]?.value || '';

    let connectUrl: string;
    try {
      connectUrl = base44.agents.getWhatsAppConnectURL('expense_tracker');
    } catch (e) {
      return Response.json({ error: 'Could not get connect URL' }, { status: 500 });
    }

    // Follow the redirect to get the wa.me URL with text parameter
    const resp = await fetch(connectUrl, { redirect: 'manual' });
    const location = resp.headers.get('location') || '';

    const phone = (location.match(/wa\.me\/(\d+)/) || [])[1] || cachedPhone;
    const textMatch = location.match(/[?&]text=([^&]+)/);
    let activationCode = '';
    if (textMatch) {
      const decodedText = decodeURIComponent(textMatch[1]);
      activationCode = (decodedText.match(/B44-[A-Z0-9]{6,}/i) || [])[0] || '';
    }

    // Keep the stored values in sync with the live ones
    if (phone && phone !== cachedPhone) {
      try {
        if (existingPhone[0]) {
          await base44.asServiceRole.entities.SiteSettings.update(existingPhone[0].id, { value: phone });
        } else {
          await base44.asServiceRole.entities.SiteSettings.create({ key: 'whatsapp_bot_phone', value: phone });
        }
      } catch (e) { /* non-critical */ }
    }

    // The code is deliberately NOT saved — a stored code is always expired.

    if (phone && activationCode) {
      return Response.json({ phone, activation_code: activationCode, source: 'live' });
    }

    return Response.json({
      error: 'Could not detect phone or activation code from redirect',
      location,
      phone,
    }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
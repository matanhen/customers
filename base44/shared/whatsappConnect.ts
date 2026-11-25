// Resolves the agent's live WhatsApp number and a FRESH activation code by
// following the agent connect URL redirect, then builds a direct wa.me link
// that opens the bot conversation with the client's personal code already
// typed into the message — the client never has to sign in to the app first.
//
// The activation code (B44-XXXXXXXX) is one-time and never stored: every
// generated link carries a new one.

export const WHATSAPP_AGENT_NAME = 'expense_tracker';

export async function resolveWhatsappConnect(base44: any) {
  let phone = '';
  let activationCode = '';

  try {
    const connectUrl = base44.agents.getWhatsAppConnectURL(WHATSAPP_AGENT_NAME);
    const resp = await fetch(connectUrl, { redirect: 'manual' });
    const location = resp.headers.get('location') || '';
    phone = (location.match(/wa\.me\/(\d+)/) || [])[1] || '';
    const textMatch = location.match(/[?&]text=([^&]+)/);
    if (textMatch) {
      const decoded = decodeURIComponent(textMatch[1]);
      activationCode = (decoded.match(/B44-[A-Z0-9]{6,}/i) || [])[0] || '';
    }
  } catch { /* fall back to the cached number below */ }

  if (!phone) {
    try {
      const cached = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'whatsapp_bot_phone' });
      phone = cached[0]?.value || '';
    } catch { /* ignore */ }
  }

  return { phone, activationCode };
}

// Message the client's WhatsApp opens with — the same format the bot already
// parses: activation code + personal code.
export function buildDirectWhatsappLink(phone: string, activationCode: string, personalCode: string) {
  const lines = ['Send this message to connect and start chatting!'];
  if (activationCode) lines.push('', `Activation code: ${activationCode}`);
  if (personalCode) lines.push('', `קוד אישי : ${personalCode}`);
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}
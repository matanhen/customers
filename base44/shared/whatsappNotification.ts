// Shared helper for sending WhatsApp notifications to clients via the expense_tracker agent.
//
// The agent's addMessage API only allows the conversation owner to add messages.
// The admin (agent owner) can add messages to conversations they own — including the
// client's original WhatsApp conversation. We prefer the conversation with the most
// messages (the original one the client started), because it has an active WhatsApp
// session and the platform will deliver the agent's response to WhatsApp.

function normalizePhone(p: string): string {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

function toInternational(p: string): string {
  const normalized = normalizePhone(p);
  if (!normalized) return '';
  return '972' + normalized.replace(/^0/, '');
}

export async function sendWhatsappNotification(base44: any, phone: string, message: string) {
  if (!phone) return { success: false, error: 'אין מספר טלפון' };
  if (!message) return { success: false, error: 'אין תוכן הודעה' };

  const targetPhone = normalizePhone(phone);
  const internationalPhone = toInternational(phone);

  // List all conversations for the agent
  let conversations: any[] = [];
  try {
    conversations = await base44.agents.listConversations({ agent_name: 'expense_tracker' });
  } catch (e: any) {
    return { success: false, error: 'שגיאה בגישה לשיחות: ' + e.message };
  }

  // Find all conversations for this phone number, sorted by message count (descending).
  // The conversation with the most messages is the client's original WhatsApp conversation,
  // which has an active WhatsApp session — the platform will deliver the response to WhatsApp.
  const phoneConvs = conversations
    .filter((c: any) => {
      const cp = normalizePhone(c.metadata?.phone_number || '');
      return cp && cp === targetPhone;
    })
    .sort((a: any, b: any) => (b.messages?.length || 0) - (a.messages?.length || 0));

  // Try to add the [SYSTEM] message to an existing conversation for this phone
  for (const conv of phoneConvs) {
    try {
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `[SYSTEM] ${message}`,
      });
      return { success: true, method: 'existing_conversation', conversation_id: conv.id };
    } catch (e: any) {
      // Can't add to this conversation (Access denied) - try the next one
    }
  }

  // No existing conversation worked - create a new one with the client's phone
  try {
    const newConv = await base44.agents.createConversation({
      agent_name: 'expense_tracker',
      metadata: {
        phone_number: internationalPhone,
        channel: 'whatsapp',
        name: 'Proactive notification',
      },
    });

    await base44.agents.addMessage(newConv, {
      role: 'user',
      content: `[SYSTEM] ${message}`,
    });

    return { success: true, method: 'new_conversation', conversation_id: newConv.id };
  } catch (e: any) {
    return { success: false, error: 'שגיאה ביצירת שיחה: ' + e.message };
  }
}
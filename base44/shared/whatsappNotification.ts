// Shared helper for sending WhatsApp notifications to clients via the expense_tracker agent.
//
// We add the notification as an ASSISTANT message directly to the client's existing
// WhatsApp conversation. Using role: 'assistant' (not 'user' with [SYSTEM] prefix)
// makes the platform deliver the message to WhatsApp — when a 'user' message is added
// programmatically, the agent's response is NOT delivered to WhatsApp because the
// trigger didn't originate from WhatsApp.
//
// We prefer the conversation with the most messages (the original one the client started
// via WhatsApp), because it has an active WhatsApp session.
//
// All phone numbers are handled in international format (972...) for matching, because
// that's how the WhatsApp channel stores them in conversation metadata.

function toInternational(p: string): string {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '972' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = cleaned;
  else if (cleaned.startsWith('0')) cleaned = '972' + cleaned.slice(1);
  return cleaned;
}

export async function sendWhatsappNotification(base44: any, phone: string, message: string, userInfo?: { name?: string; email?: string }) {
  if (!phone) return { success: false, error: 'אין מספר טלפון' };
  if (!message) return { success: false, error: 'אין תוכן הודעה' };

  const internationalPhone = toInternational(phone);
  if (!internationalPhone) return { success: false, error: 'מספר טלפון לא תקין' };

  // List all conversations for the agent
  let conversations: any[] = [];
  try {
    conversations = await base44.agents.listConversations({ agent_name: 'expense_tracker' });
  } catch (e: any) {
    return { success: false, error: 'שגיאה בגישה לשיחות: ' + e.message };
  }

  // Find all conversations for this phone number (in 972... format), sorted by message count (descending).
  // The conversation with the most messages is the client's original WhatsApp conversation,
  // which has an active WhatsApp session — the platform will deliver the response to WhatsApp.
  const phoneConvs = conversations
    .filter((c: any) => {
      const cp = c.metadata?.phone_number || '';
      return cp === internationalPhone;
    })
    .sort((a: any, b: any) => (b.messages?.length || 0) - (a.messages?.length || 0));

  // If we found the original conversation, update its metadata with user info (name, email)
  // so the dashboard shows who the conversation belongs to.
  if (phoneConvs.length > 0 && userInfo?.name) {
    const best = phoneConvs[0];
    const existingMeta = best.metadata || {};
    if (!existingMeta.user_name || !existingMeta.user_email) {
      try {
        await base44.agents.updateConversation(best.id, {
          metadata: {
            ...existingMeta,
            user_name: userInfo.name,
            user_email: userInfo.email || '',
          },
        });
      } catch (e) { /* non-critical */ }
    }
  }

  // Add the notification as an ASSISTANT message directly to the conversation.
  // Using role: 'assistant' (not 'user' with [SYSTEM] prefix) because:
  // - When we add a 'user' message, the agent processes it and responds, but the
  //   platform does NOT deliver the response to WhatsApp (the user message didn't
  //   originate from WhatsApp, so the platform treats it as an internal message).
  // - Adding an 'assistant' message directly makes the platform deliver it to
  //   WhatsApp as the agent "speaking" in the active WhatsApp conversation.
  for (const conv of phoneConvs) {
    try {
      await base44.agents.addMessage(conv, {
        role: 'assistant',
        content: message,
      });
      return { success: true, method: 'existing_conversation', conversation_id: conv.id, message_count: conv.messages?.length || 0 };
    } catch (e: any) {
      // Can't add to this conversation - try the next one
    }
  }

  // No existing conversation worked - create a new one with the client's phone (972 format)
  try {
    const newConv = await base44.agents.createConversation({
      agent_name: 'expense_tracker',
      metadata: {
        phone_number: internationalPhone,
        channel: 'whatsapp',
        name: userInfo?.name || 'Proactive notification',
        user_name: userInfo?.name || '',
        user_email: userInfo?.email || '',
      },
    });

    await base44.agents.addMessage(newConv, {
      role: 'assistant',
      content: message,
    });

    return { success: true, method: 'new_conversation', conversation_id: newConv.id };
  } catch (e: any) {
    return { success: false, error: 'שגיאה ביצירת שיחה: ' + e.message };
  }
}
// Shared helper for sending WhatsApp notifications to clients via the expense_tracker agent.
//
// We add a [SYSTEM]-prefixed USER message to the client's existing WhatsApp conversation.
// The agent sees the [SYSTEM] prefix and passes the text verbatim to the user. The message
// appears in the Conversation log. We prefer the conversation with the most messages (the
// original one the client started via WhatsApp), because it has an active WhatsApp session.
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

  // If no user info provided, try to look up the user by phone for metadata enrichment.
  // This allows callers to send notifications based on phone number alone.
  if (!userInfo?.name) {
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const user = allUsers.find((u: any) => toInternational(u.phone) === internationalPhone);
      if (user) {
        userInfo = {
          name: user.custom_name || user.full_name || '',
          email: user.email || '',
        };
      }
    } catch (e) { /* non-critical — proceed without user info */ }
  }

  // List all conversations for the agent
  let conversations: any[] = [];
  try {
    conversations = await base44.agents.listConversations({ agent_name: 'expense_tracker' });
  } catch (e: any) {
    return { success: false, error: 'שגיאה בגישה לשיחות: ' + e.message };
  }

  // Find all conversations for this phone number (in 972... format).
  // KEY: only conversations with `last_received_message_id_tracked` in metadata are truly
  // connected to WhatsApp — they've received at least one real WhatsApp message and have an
  // active WhatsApp session. Conversations without this field (e.g. ones we created
  // programmatically) will NOT deliver agent responses to WhatsApp.
  // Among the connected ones, sort by updated_date descending to pick the most recent/active.
  const phoneConvs = conversations
    .filter((c: any) => {
      const cp = c.metadata?.phone_number || '';
      return cp === internationalPhone && c.metadata?.last_received_message_id_tracked;
    })
    .sort((a: any, b: any) => new Date(b.updated_date || 0).getTime() - new Date(a.updated_date || 0).getTime());

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

  // If no WhatsApp-connected conversation exists for this phone, we cannot deliver
  // the message to WhatsApp. Adding a [SYSTEM] message to a non-connected conversation
  // would only show in the dashboard, not on the client's WhatsApp. Return failure so
  // the caller knows delivery didn't happen.
  if (phoneConvs.length === 0) {
    return { success: false, error: 'אין שיחת WhatsApp פעילה עבור מספר זה. הלקוח צרך לשלוח הודעה לבוט לפחות פעם אחת כדי לקבל הודעות פרואקטיביות.' };
  }

  // Add the [SYSTEM] message to the conversation. The agent sees the [SYSTEM] prefix
  // and passes the text verbatim to the user. The message appears in the Conversation log.
  for (const conv of phoneConvs) {
    try {
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `[SYSTEM] ${message}`,
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
      role: 'user',
      content: `[SYSTEM] ${message}`,
    });

    return { success: true, method: 'new_conversation', conversation_id: newConv.id };
  } catch (e: any) {
    return { success: false, error: 'שגיאה ביצירת שיחה: ' + e.message };
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function normalizePhone(p) {
  if (!p) return '';
  let cleaned = p.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+972')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('972')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
}

// Sends a WhatsApp message to a client by finding their conversation and adding a [SYSTEM] message.
// The agent recognizes [SYSTEM] prefix and relays the exact text to the user.
// Params: client_phone, message_text
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { client_phone, message_text } = body;

    if (!client_phone || !message_text) {
      return Response.json({ error: 'נדרשים: client_phone, message_text' }, { status: 400 });
    }

    const targetPhone = normalizePhone(client_phone);

    // List all conversations for the expense_tracker agent
    let conversations = [];
    try {
      conversations = await base44.agents.listConversations({ agent_name: 'expense_tracker' });
    } catch (e) {
      return Response.json({ 
        success: false, 
        error: 'לא ניתן לגשת לשיחות הסוכן',
        details: e.message 
      }, { status: 200 });
    }

    // Find the client's conversation by phone in metadata
    let clientConversation = null;
    for (const conv of conversations) {
      const metadata = conv.metadata || {};
      // Check various possible phone field names in metadata
      const convPhone = normalizePhone(
        metadata.phone || 
        metadata.whatsapp_phone || 
        metadata.from || 
        metadata.phone_number || 
        metadata.phoneNumber || 
        metadata.user_phone ||
        ''
      );
      if (convPhone && convPhone === targetPhone) {
        clientConversation = conv;
        break;
      }
    }

    if (!clientConversation) {
      return Response.json({ 
        success: false, 
        error: 'לקוח לא מחובר לווצאפ - אין שיחה פעילה',
        client_phone: client_phone 
      }, { status: 200 });
    }

    // Add a [SYSTEM] message to the conversation - the agent will relay this to the client
    await base44.agents.addMessage(clientConversation, {
      role: 'user',
      content: `[SYSTEM] ${message_text}`,
    });

    return Response.json({ 
      success: true, 
      conversation_id: clientConversation.id 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
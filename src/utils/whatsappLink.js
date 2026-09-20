// Builds a WhatsApp link with an opening message that identifies the app,
// the user's role, and their personal code — so the WhatsApp bot/agent
// recognizes the message as coming from this Base44 app.

// Builds a WhatsApp link with an activation message the bot recognizes.
// Format: "Send this message to connect and start chatting!\n\nActivation code: B44-XXXX"
// where B44- identifies this Base44 app and XXXX is the user's personal code.

export function buildWhatsappOpenLink(botPhone, personalCode, userType) {
  const message = `Send this message to connect and start chatting!\n\nActivation code: B44-${personalCode}`;
  return `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;
}
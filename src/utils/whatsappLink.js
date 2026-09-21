// Builds a WhatsApp link with the agent's real activation code plus the
// user's personal code, so the WhatsApp bot/agent recognizes the message
// and starts a conversation.
//
// The activation code (B44-XXXXXXXX) is the platform-assigned code for the
// agent — extracted from the agent's WhatsApp connect URL and cached in
// SiteSettings. It's the SAME for all users (the bot uses the personal
// code to identify each individual user).
//
// Message format:
//   Send this message to connect and start chatting!
//
//   Activation code: B44-XXXXXXXX
//
//   קוד אישי : XXXX
//
// - B44-XXXXXXXX is the agent's activation code (same for all users).
// - XXXX is the user's 4-letter personal code (unique per user).

export function buildWhatsappOpenLink(botPhone, personalCode, userType, activationCode) {
  const code = personalCode || "";
  const actCode = activationCode || "";
  const message =
    "Send this message to connect and start chatting!\n\n" +
    `Activation code: ${actCode}\n\n` +
    `קוד אישי : ${code}`;
  return `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;
}
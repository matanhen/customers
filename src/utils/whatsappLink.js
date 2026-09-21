// Builds a WhatsApp link with a per-user activation code plus the user's
// personal code, so the WhatsApp bot/agent recognizes the message and
// starts a conversation.
//
// Each user gets a UNIQUE activation code (B44-XXXX) derived from their
// personal code, so WhatsApp never rejects it as "code already used".
// The bot extracts the 4-letter personal code from either line.
//
// Message format:
//   Send this message to connect and start chatting!
//
//   Activation code: B44-XXXX
//
//   קוד אישי : XXXX
//
// - XXXX is the user's 4-letter personal code (unique per user).
// - B44-XXXX is the per-user activation code (also unique).

export function buildWhatsappOpenLink(botPhone, personalCode, userType) {
  const code = personalCode || "";
  const message =
    "Send this message to connect and start chatting!\n\n" +
    `Activation code: B44-${code}\n\n` +
    `קוד אישי : ${code}`;
  return `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;
}
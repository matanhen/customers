// Builds a WhatsApp link with the agent activation message plus the user's
// personal code, so the WhatsApp bot/agent recognizes the message.
//
// Message format:
//   Send this message to connect and start chatting!
//
//   Activation code: B44-2ZWQ9VLC
//
//   קוד אישי : XXXX
//
// - B44-2ZWQ9VLC is the app's WhatsApp activation code (same for all users).
// - XXXX is the user's 4-letter personal code (unique per user).

const APP_ACTIVATION_CODE = "B44-2ZWQ9VLC";

export function buildWhatsappOpenLink(botPhone, personalCode, userType) {
  const message =
    "Send this message to connect and start chatting!\n\n" +
    `Activation code: ${APP_ACTIVATION_CODE}\n\n` +
    `קוד אישי : ${personalCode || ""}`;
  return `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;
}
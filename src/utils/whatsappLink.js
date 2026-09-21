// Builds a WhatsApp link with the user's personal code so the WhatsApp
// bot/agent recognizes the message and starts a conversation.
//
// The B44- activation code is a one-time code used to connect the bot
// channel (done once by the admin). Users only need their personal code
// (unique per user) to start chatting — sending the shared B44- code
// again triggers a "code already used" error from WhatsApp.
//
// Message format:
//   Send this message to connect and start chatting!
//
//   קוד אישי : XXXX
//
// - XXXX is the user's 4-letter personal code (unique per user).

export function buildWhatsappOpenLink(botPhone, personalCode, userType) {
  const message =
    "Send this message to connect and start chatting!\n\n" +
    `קוד אישי : ${personalCode || ""}`;
  return `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;
}
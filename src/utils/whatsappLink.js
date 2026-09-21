// Builds a WhatsApp link with a per-user activation code (B44-XXXXXXXX)
// plus the user's personal code, so the WhatsApp bot/agent recognizes the
// message and starts a conversation.
//
// Each user gets a UNIQUE 8-char activation code derived deterministically
// from their personal code — so WhatsApp never rejects it as "code already
// used". The activation code is separate from the personal code.
//
// Message format:
//   Send this message to connect and start chatting!
//
//   Activation code: B44-XXXXXXXX
//
//   קוד אישי : XXXX
//
// - XXXX is the user's 4-letter personal code (unique per user).
// - B44-XXXXXXXX is the per-user activation code (8 uppercase letters).

// Deterministically derives a unique 8-char activation code from the
// personal code. Same personal code always yields the same activation code.
function deriveActivationCode(personalCode) {
  const seed = (personalCode || "XXXX").toUpperCase();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  let code = "";
  for (let i = 0; i < 8; i++) {
    hash = ((hash << 5) + hash + i * 37 + 11) | 0;
    code += chars[Math.abs(hash) % 26];
  }
  return code;
}

export function buildWhatsappOpenLink(botPhone, personalCode, userType) {
  const code = personalCode || "";
  const activationCode = deriveActivationCode(code);
  const message =
    "Send this message to connect and start chatting!\n\n" +
    `Activation code: B44-${activationCode}\n\n` +
    `קוד אישי : ${code}`;
  return `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;
}
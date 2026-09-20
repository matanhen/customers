// Builds a WhatsApp link with an opening message that identifies the app,
// the user's role, and their personal code — so the WhatsApp bot/agent
// recognizes the message as coming from this Base44 app.

const APP_NAME = "צעירים מתעשרים";
const APP_URL = "matanhen-customers.base44.app";

function getRoleLabel(userType) {
  if (userType === 'admin') return 'מנהל מערכת';
  if (userType === 'advisor') return 'יועץ';
  return 'לקוח';
}

export function buildWhatsappOpenLink(botPhone, personalCode, userType) {
  const role = getRoleLabel(userType);
  const message = `שלום! אני ${role} במערכת "${APP_NAME}" (${APP_URL}).\nקוד אישי: ${personalCode}`;
  return `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;
}
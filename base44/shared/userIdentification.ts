// Shared user identification helper for backend functions.
// In the WhatsApp context, base44.auth.me() returns the agent owner (admin),
// not the WhatsApp sender. To fix this, we identify users by a personal code
// passed from the agent. If no personal_code is provided, fall back to auth.me()
// (for non-WhatsApp contexts like the app UI).

export async function identifyUser(base44, body) {
  const personalCode = (body?.personal_code || body?.personalCode || '').toString().trim().toUpperCase();
  if (personalCode) {
    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => (u.personal_code || '').toUpperCase() === personalCode);
    return user || null;
  }
  // Fallback to auth.me() for non-WhatsApp contexts
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
}

export function generatePersonalCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

export async function generateUniquePersonalCode(base44) {
  const users = await base44.asServiceRole.entities.User.list();
  const existingCodes = new Set(users.map(u => (u.personal_code || '').toUpperCase()));
  let code;
  let attempts = 0;
  do {
    code = generatePersonalCode();
    attempts++;
    if (attempts > 100) break;
  } while (existingCodes.has(code));
  return code;
}
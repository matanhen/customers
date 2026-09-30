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

// Every code already in use — from app users AND from clients whose code is
// stored on their registration record because they have not logged in yet.
async function collectExistingCodes(base44) {
  const [users, allowedUsers] = await Promise.all([
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.AllowedUser.list(),
  ]);
  const codes = new Set();
  const add = (value) => {
    const code = (value || '').toString().trim().toUpperCase();
    if (code) codes.add(code);
  };
  users.forEach(u => add(u.personal_code));
  allowedUsers.forEach(a => add(a.personal_code));
  return codes;
}

export async function generateUniquePersonalCode(base44) {
  const existingCodes = await collectExistingCodes(base44);
  let code;
  let attempts = 0;
  do {
    code = generatePersonalCode();
    attempts++;
    if (attempts > 200) break;
  } while (existingCodes.has(code));
  return code;
}

// Guarantees a personal code for one client, from the moment they register —
// including clients that registered from an external webhook and never logged
// in: their code lives on the client (AllowedUser) record until they sign up,
// and is mirrored onto the app user record as soon as that record exists.
export async function ensureClientPersonalCode(base44, { email, full_name, phone }) {
  const normalizedEmail = (email || '').toString().trim().toLowerCase();
  if (!normalizedEmail) return { personal_code: '', allowed_user: null, user: null };

  const [allowedMatches, userMatches] = await Promise.all([
    base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail }),
    base44.asServiceRole.entities.User.filter({ email: normalizedEmail }),
  ]);
  let allowedUser = allowedMatches[0] || null;
  const user = userMatches[0] || null;

  let code = (allowedUser?.personal_code || user?.personal_code || '').toString().trim().toUpperCase();

  if (!allowedUser) {
    // A client known only through an advisor assignment still needs a place to
    // keep their code — give them their registration record.
    const assignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: normalizedEmail });
    if (assignments.length > 0) {
      allowedUser = await base44.asServiceRole.entities.AllowedUser.create({
        email: normalizedEmail,
        full_name: full_name || assignments[0].client_name || '',
        user_type: 'client',
        phone: phone || '',
        personal_code: code || await generateUniquePersonalCode(base44),
      });
      code = (allowedUser.personal_code || '').toString().trim().toUpperCase();
    }
  } else if (!(allowedUser.personal_code || '').toString().trim()) {
    if (!code) code = await generateUniquePersonalCode(base44);
    const patch: Record<string, string> = { personal_code: code };
    if (!allowedUser.full_name && full_name) patch.full_name = full_name;
    if (!allowedUser.phone && phone) patch.phone = phone;
    allowedUser = await base44.asServiceRole.entities.AllowedUser.update(allowedUser.id, patch);
  }

  if (user && !(user.personal_code || '').toString().trim()) {
    if (!code) code = await generateUniquePersonalCode(base44);
    await base44.asServiceRole.entities.User.update(user.id, { personal_code: code });
  }

  return { personal_code: code, allowed_user: allowedUser, user };
}
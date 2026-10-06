// Shared user identification helper for backend functions.
// In the WhatsApp context, base44.auth.me() returns the agent owner (admin),
// not the WhatsApp sender. To fix this, we identify users by a personal code
// passed from the agent. If no personal_code is provided, fall back to auth.me()
// (for non-WhatsApp contexts like the app UI).

export const normalizeCode = (value) => (value || '').toString().trim().toUpperCase();
export const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase();

// Entity reads can return either a plain array or a page object.
const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

// A personal code lives on the app user record once the client has logged in,
// and on the client's registration (AllowedUser) record while they have not
// logged in yet. Both are searched, so a client's code always identifies them.
export async function findUserByPersonalCode(base44, rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;

  const users = asArray(await base44.asServiceRole.entities.User.list());
  const user = users.find(u => normalizeCode(u.personal_code) === code);
  if (user) return user;

  const allowedUsers = asArray(await base44.asServiceRole.entities.AllowedUser.list({ limit: 1000 }));
  const registration = allowedUsers.find(a => normalizeCode(a.personal_code) === code);
  if (!registration) return null;

  // The code can also be the one on the registration record of a client that
  // already has an account — prefer the account, so recording expenses and
  // meetings keeps working.
  const email = normalizeEmail(registration.email);
  if (email) {
    const linked = asArray(await base44.asServiceRole.entities.User.filter({ email }))[0];
    if (linked) {
      return { ...linked, personal_code: code, phone: linked.phone || registration.phone || '' };
    }
  }

  return {
    id: '',
    full_name: registration.full_name || '',
    custom_name: registration.full_name || '',
    email: registration.email || '',
    phone: registration.phone || '',
    user_type: registration.user_type || 'client',
    personal_code: code,
    account_pending: true,
  };
}

export async function identifyUser(base44, body) {
  const personalCode = normalizeCode(body?.personal_code || body?.personalCode);
  if (personalCode) {
    return await findUserByPersonalCode(base44, personalCode);
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
    base44.asServiceRole.entities.AllowedUser.list({ limit: 1000 }),
  ]);
  const codes = new Set();
  const add = (value) => {
    const code = normalizeCode(value);
    if (code) codes.add(code);
  };
  asArray(users).forEach(u => add(u.personal_code));
  asArray(allowedUsers).forEach(a => add(a.personal_code));
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
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { personal_code: '', allowed_user: null, user: null };

  const [allowedMatches, userMatches] = await Promise.all([
    base44.asServiceRole.entities.AllowedUser.filter({ email: normalizedEmail }),
    base44.asServiceRole.entities.User.filter({ email: normalizedEmail }),
  ]);
  let allowedUser = asArray(allowedMatches)[0] || null;
  const user = asArray(userMatches)[0] || null;

  let code = normalizeCode(allowedUser?.personal_code || user?.personal_code);

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
      code = normalizeCode(allowedUser.personal_code);
    }
  } else if (!normalizeCode(allowedUser.personal_code)) {
    if (!code) code = await generateUniquePersonalCode(base44);
    const patch: Record<string, string> = { personal_code: code };
    if (!allowedUser.full_name && full_name) patch.full_name = full_name;
    if (!allowedUser.phone && phone) patch.phone = phone;
    allowedUser = await base44.asServiceRole.entities.AllowedUser.update(allowedUser.id, patch);
  }

  // The registration code is the one the client receives (it is the code inside
  // their personal WhatsApp link), so the app user record always follows it.
  if (user && code && normalizeCode(user.personal_code) !== code) {
    try {
      await base44.asServiceRole.entities.User.update(user.id, { personal_code: code });
    } catch (e) { /* non-critical */ }
  }

  return { personal_code: code, allowed_user: allowedUser, user };
}
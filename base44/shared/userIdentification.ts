// Shared user identification helper for backend functions.
// In the WhatsApp context, base44.auth.me() returns the agent owner (admin),
// not the WhatsApp sender. To fix this, we identify users by a personal code
// passed from the agent. If no personal_code is provided, fall back to auth.me()
// (for non-WhatsApp contexts like the app UI).
//
// Resilience: a client's code can fall out of sync with the code inside the
// personal link they already received (a record was re-created, codes were
// unified between the app user and the registration record, etc.). The bot
// therefore ALSO identifies by the sender's WhatsApp phone number, and writes
// the code the client actually sent back onto their record — so the same code
// keeps working from then on.

import { normalizePhone } from './phoneUtils.ts';

export const normalizeCode = (value) => (value || '').toString().trim().toUpperCase();
export const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase();

// Entity reads can return either a plain array or a page object.
const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

// Last 9 digits — equal for 05XXXXXXXX, 972XXXXXXXXX and +972-XX-XXX-XXXX.
const phoneKey = (value) => normalizePhone(value).replace(/\D/g, '').slice(-9);

// Every app user, paged — a plain list() only returns the first page, which
// used to hide users beyond it from the lookup.
async function listAllUsers(base44) {
  const seen = new Map();
  const limit = 200;
  for (let skip = 0; skip <= 4000; skip += limit) {
    let page;
    try {
      page = asArray(await base44.asServiceRole.entities.User.list('-created_date', limit, skip));
    } catch {
      page = asArray(await base44.asServiceRole.entities.User.list());
    }
    let added = 0;
    for (const u of page) {
      if (u && u.id && !seen.has(u.id)) { seen.set(u.id, u); added++; }
    }
    if (page.length < limit || added === 0) break;
  }
  return [...seen.values()];
}

async function listAllAllowedUsers(base44) {
  const seen = new Map();
  const page = asArray(await base44.asServiceRole.entities.AllowedUser.list({ limit: 1000 }));
  for (const a of page) if (a && a.id) seen.set(a.id, a);
  return [...seen.values()];
}

// Pulls the personal code out of a longer string (e.g. the whole WhatsApp
// opening message: "... \n\nקוד אישי : OAAO"). Only looks AFTER the "קוד אישי"
// marker, so the platform activation code (B44-XXXXXXXX) and English words are
// never mistaken for a personal code.
export function extractPersonalCode(raw) {
  const text = (raw || '').toString().toUpperCase();

  // 1. Straight after the "קוד אישי" marker (the personal link's opening message).
  const idx = text.indexOf('קוד אישי');
  if (idx >= 0) {
    const scope = text.slice(idx, idx + 40);
    const tokens = scope.split(/[^A-Z]+/).filter(Boolean);
    const afterMarker = tokens.find((t) => t.length === 4);
    if (afterMarker) return afterMarker;
  }

  // 2. The message is just the code ("KQWE").
  const tokens = text.split(/[^A-Z]+/).filter(Boolean);
  if (tokens.length === 1 && tokens[0].length === 4) return tokens[0];

  // 3. Any other way of writing it — "קוד: KQWE", "code KQWE", etc.
  if (/קוד|CODE/.test(text)) {
    const token = tokens.find((t) => t.length === 4);
    if (token) return token;
  }

  return '';
}

function registrationOnly(registration) {
  return {
    id: '',
    allowed_user_id: registration.id,
    full_name: registration.full_name || '',
    custom_name: registration.full_name || '',
    email: registration.email || '',
    phone: registration.phone || '',
    user_type: registration.user_type || 'client',
    personal_code: normalizeCode(registration.personal_code),
    account_pending: true,
  };
}

async function lookupUserByCode(base44, code) {
  if (!code) return null;

  const users = await listAllUsers(base44);
  const user = users.find(u => normalizeCode(u.personal_code) === code);
  if (user) return user;

  const allowedMatches = await base44.asServiceRole.entities.AllowedUser.filter({ personal_code: code });
  let registration = asArray(allowedMatches)[0];
  if (!registration) {
    const allowedUsers = await listAllAllowedUsers(base44);
    registration = allowedUsers.find(a => normalizeCode(a.personal_code) === code);
  }
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

  return registrationOnly(registration);
}

// Finds the client by the WhatsApp number they write from. This is the safety
// net for a client whose code changed after they were sent their personal link.
async function lookupUserByPhone(base44, rawPhone) {
  const key = phoneKey(rawPhone);
  if (!key) return null;

  const users = await listAllUsers(base44);
  const userHits = users.filter(u => phoneKey(u.phone) === key);
  const allowedHits = (await listAllAllowedUsers(base44)).filter(a => phoneKey(a.phone) === key);

  // Different people on the same number (e.g. a couple sharing a phone) — do
  // not guess.
  const emails = new Set([...userHits, ...allowedHits].map(x => normalizeEmail(x.email)).filter(Boolean));
  if (emails.size !== 1) return null;

  const email = [...emails][0];

  const linked = users.find(u => normalizeEmail(u.email) === email)
    || asArray(await base44.asServiceRole.entities.User.filter({ email }))[0];

  if (linked) {
    const registration = allowedHits.find(a => normalizeEmail(a.email) === email);
    return {
      ...linked,
      personal_code: normalizeCode(linked.personal_code || registration?.personal_code),
      phone: linked.phone || registration?.phone || '',
    };
  }

  const registration = allowedHits.find(a => normalizeEmail(a.email) === email);
  return registration ? registrationOnly(registration) : null;
}

// Makes sure the code the client actually uses is stored on both records of the
// client, so it keeps working (link, bot, app). Adopts the code the client sent
// when it is a valid 4-letter code that no one else uses; otherwise keeps the
// code already on their records.
async function healPersonalCode(base44, user, sentCode) {
  const email = normalizeEmail(user.email);
  const own = normalizeCode(user.personal_code || sentCode);
  const allowed = email
    ? asArray(await base44.asServiceRole.entities.AllowedUser.filter({ email }))[0]
    : null;
  const registrationCode = normalizeCode(allowed?.personal_code);

  let target = own || registrationCode;
  if (!target) target = await generateUniquePersonalCode(base44);

  // Adopt the code the client sent, if it is well formed and unused.
  const candidate = normalizeCode(sentCode);
  if (/^[A-Z]{4}$/.test(candidate) && candidate !== target) {
    const [candidateUsers, candidateAllowed] = await Promise.all([
      asArray(await base44.asServiceRole.entities.User.filter({ personal_code: candidate })),
      asArray(await base44.asServiceRole.entities.AllowedUser.filter({ personal_code: candidate })),
    ]);
    const takenByOther = [...candidateUsers, ...candidateAllowed]
      .some(x => normalizeEmail(x.email) !== email);
    if (!takenByOther) target = candidate;
  }

  if (user.id && normalizeCode(user.personal_code) !== target) {
    try { await base44.asServiceRole.entities.User.update(user.id, { personal_code: target }); } catch { /* non-critical */ }
  }
  if (allowed && normalizeCode(allowed.personal_code) !== target) {
    try { await base44.asServiceRole.entities.AllowedUser.update(allowed.id, { personal_code: target }); } catch { /* non-critical */ }
  }

  return { ...user, personal_code: target };
}

// Identifies a client by their personal code. Tolerates the agent passing a
// longer value (a whole line or the full opening message) by falling back to
// the code embedded after the "קוד אישי" marker. When the code is unknown but
// the sender's WhatsApp number is, the client is identified by phone and their
// records are re-aligned to the code they sent.
export async function findUserByPersonalCode(base44, rawCode, rawPhone) {
  const code = normalizeCode(rawCode);
  const embedded = normalizeCode(extractPersonalCode(rawCode));

  let user = code ? await lookupUserByCode(base44, code) : null;
  if (!user && embedded && embedded !== code) {
    user = await lookupUserByCode(base44, embedded);
  }
  if (user) return user;

  // Code not found — fall back to the WhatsApp number.
  const byPhone = await lookupUserByPhone(base44, rawPhone);
  if (!byPhone) return null;

  return await healPersonalCode(base44, byPhone, /^[A-Z]{4}$/.test(code) ? code : embedded);
}

export async function identifyUser(base44, body) {
  const personalCode = normalizeCode(body?.personal_code || body?.personalCode);
  const phone = (body?.whatsapp_phone || body?.phone || body?.whatsappPhone || '').toString().trim();
  if (personalCode || phone) {
    const found = await findUserByPersonalCode(base44, personalCode, phone);
    if (found) return found;
    // An explicit identifier was supplied and did not match any client — never
    // fall back to auth.me() here, or the agent's own account would be used.
    return null;
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
    listAllUsers(base44),
    listAllAllowedUsers(base44),
  ]);
  const codes = new Set();
  const add = (value) => {
    const code = normalizeCode(value);
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

  // A client that exists only as an app user (no registration record) still needs
  // a code, otherwise their personal link carries none and the bot can't identify
  // them.
  if (!code) code = await generateUniquePersonalCode(base44);

  // The registration code is the one the client receives (it is the code inside
  // their personal WhatsApp link), so the app user record always follows it.
  if (user && code && normalizeCode(user.personal_code) !== code) {
    try {
      await base44.asServiceRole.entities.User.update(user.id, { personal_code: code });
    } catch (e) { /* non-critical */ }
  }

  return { personal_code: code, allowed_user: allowedUser, user };
}
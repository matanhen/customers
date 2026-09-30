import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateUniquePersonalCode } from '../../shared/userIdentification.ts';
import { normalizePhone } from '../../shared/phoneUtils.ts';

// Public webhook that registers a new client: name + email (+ phone).
//
// It is called by external systems (automation / landing form) without a user
// session, so it must be safe to retry:
//  - registering the same email twice never creates a second client record
//  - a step that cannot run without an authorized caller (the invitation) must
//    never fail the registration itself

function pickField(body: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

// Accepts JSON or form-encoded payloads (both are common for webhook callers).
async function readPayload(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text().catch(() => '');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    const payload: Record<string, string> = {};
    new URLSearchParams(raw).forEach((value, key) => { payload[key] = value; });
    return payload;
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
    }

    const body = await readPayload(req);
    const name = pickField(body, ['name', 'full_name', 'fullName']);
    const rawEmail = pickField(body, ['email', 'mail']);
    const rawPhone = pickField(body, ['phone', 'phone_number', 'phoneNumber', 'mobile']);

    if (!name || !rawEmail) {
      return Response.json({ error: 'Missing required fields: name and email' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: `Invalid email address: ${rawEmail}` }, { status: 400 });
    }
    const phone = normalizePhone(rawPhone);

    const base44 = createClientFromRequest(req);

    // --- Client record (idempotent: one AllowedUser per email, whatever the casing) ---
    let matches = await base44.asServiceRole.entities.AllowedUser.filter({ email });
    if (!matches.length && rawEmail !== email) {
      matches = await base44.asServiceRole.entities.AllowedUser.filter({ email: rawEmail });
    }

    let created = false;
    let client = matches[0] || null;
    if (client) {
      const patch: Record<string, string> = {};
      if (!client.full_name && name) patch.full_name = name;
      if (!client.phone && phone) patch.phone = phone;
      if (Object.keys(patch).length) {
        client = await base44.asServiceRole.entities.AllowedUser.update(client.id, patch);
      }
    } else {
      client = await base44.asServiceRole.entities.AllowedUser.create({
        email,
        full_name: name,
        user_type: 'client',
        phone,
      });
      created = true;
    }

    // --- Invitation (best effort) ---
    // The service-role client has no users module, so inviting has to run on the
    // request's own client, which requires an authorized token on the call (for
    // example the app's API key). Without it the client is still registered and
    // can be invited from the admin panel — the registration never fails here.
    let invited = false;
    const hasAuthorizedCaller = !!(req.headers.get('Authorization') || req.headers.get('x-api-key'));
    if (hasAuthorizedCaller) {
      try {
        await base44.users.inviteUser(email, 'user');
        invited = true;
      } catch (inviteError) {
        console.log(`Invite skipped for ${email}: ${inviteError?.message || inviteError}`);
      }
    }

    // --- Link the app user record when it already exists ---
    // (a brand new client gets one only once they sign up)
    let userRecord: Record<string, any> | null = null;
    for (let attempt = 0; attempt < 3 && !userRecord; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
      const found = await base44.asServiceRole.entities.User.filter({ email });
      // Older records may still hold the email with its original casing
      const legacy = found[0] || (rawEmail !== email
        ? (await base44.asServiceRole.entities.User.filter({ email: rawEmail }))[0]
        : null);
      userRecord = legacy || null;
    }

    let personalCodeAssigned = false;
    if (userRecord) {
      const patch: Record<string, any> = {};
      if (!userRecord.user_type) patch.user_type = 'client';
      if (!userRecord.full_name && name) patch.full_name = name;
      if (!userRecord.custom_name && name) patch.custom_name = name;
      if (!userRecord.phone && phone) patch.phone = phone;
      if (!userRecord.personal_code) {
        patch.personal_code = await generateUniquePersonalCode(base44);
        personalCodeAssigned = true;
      }
      if (Object.keys(patch).length) {
        await base44.asServiceRole.entities.User.update(userRecord.id, patch);
      }
    }

    // --- Advisor assignment: only when the client has none yet ---
    const assignments = await base44.asServiceRole.entities.ClientAdvisorAssignment.filter({ client_email: email });
    let assignmentCreated = false;
    if (!assignments.length) {
      const admins = await base44.asServiceRole.entities.User.filter({ user_type: 'admin' });
      const admin = admins[0];
      if (admin) {
        await base44.asServiceRole.entities.ClientAdvisorAssignment.create({
          client_id: userRecord?.id || '',
          client_email: email,
          client_name: name,
          advisor_id: admin.id,
          advisor_email: admin.email || '',
        });
        assignmentCreated = true;
      }
    }

    console.log(`Webhook client ${created ? 'created' : 'already registered'}: ${email} (invited: ${invited}, user linked: ${!!userRecord}, assignment created: ${assignmentCreated})`);

    return Response.json({
      success: true,
      message: created ? 'Client added successfully' : 'Client already exists',
      client: {
        name,
        email,
        phone,
        invited,
        user_linked: !!userRecord,
        personal_code_assigned: personalCodeAssigned,
        advisor_assigned: assignmentCreated,
      },
    }, { status: created ? 201 : 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error?.message,
    }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizePhone } from '../../shared/phoneUtils.ts';

// Updates phone numbers, names, AND advisor assignments for existing users by matching
// emails from a PDF file. The PDF has 4 columns: שם מלא, טלפון, דואר אלקטרוני, יועץ אחראי.
// Admin-only function.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin' && user.user_type !== 'admin') {
      return Response.json({ error: 'אין הרשאה - נדרש מנהל מערכת' }, { status: 403 });
    }

    const body = await req.json();
    const { file_url } = body;
    if (!file_url) return Response.json({ error: 'נדרש file_url' }, { status: 400 });

    // Extract name+email+phone+advisor from the PDF.
    // The PDF has Hebrew columns: שם מלא (name), טלפון (phone), דואר אלקטרוני (email), יועץ אחראי (advisor name).
    const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'שם מלא של הלקוח' },
                email: { type: 'string', description: 'דואר אלקטרוני (אימייל) של הלקוח' },
                phone: { type: 'string', description: 'מספר טלפון של הלקוח' },
                advisor_name: { type: 'string', description: 'שם היועץ האחראי (יהיה רשום שם היועץ, לא אימייל)' },
              },
              required: ['email', 'phone'],
            },
          },
        },
        required: ['contacts'],
      },
    });

    if (extractRes.status !== 'success' || !extractRes.output) {
      return Response.json({ error: 'שגיאה בניתוח הקובץ: ' + (extractRes.details || 'לא ניתן לחלץ נתונים') }, { status: 400 });
    }

    const contacts = extractRes.output.contacts || [];
    if (contacts.length === 0) {
      return Response.json({ error: 'לא נמצאו אנשי קשר עם אימייל וטלפון בקובץ' }, { status: 400 });
    }

    // Get all users, allowed users, and assignments.
    // Use base44.entities (bypasses RLS for admin user) instead of asServiceRole.
    const allUsers = await base44.entities.User.list('-created_date', 500);
    const allAllowed = await base44.entities.AllowedUser.list('-created_date', 500);
    const allAssignments = await base44.entities.ClientAdvisorAssignment.list('-created_date', 500);

    // Build advisor lookup by name and email.
    // Known advisors: ניק קרישנוביץ, איתי בסטיקר, ניב דוד
    const advisors = allUsers.filter(u => u.user_type === 'advisor' || u.user_type === 'admin');
    const findAdvisor = (name) => {
      const nameLower = (name || '').trim().toLowerCase();
      if (!nameLower) return null;
      // Try exact match first
      let match = advisors.find(a => {
        const full = (a.custom_name || a.full_name || '').toLowerCase();
        return full === nameLower;
      });
      if (match) return match;
      // Try partial match (either direction)
      match = advisors.find(a => {
        const full = (a.custom_name || a.full_name || '').toLowerCase();
        return full.includes(nameLower) || nameLower.includes(full);
      });
      return match || null;
    };

    let updated = 0;
    let notFound = 0;
    let failed = 0;
    let advisorsUpdated = 0;
    const results = [];
    const notFoundClients = [];

    for (const contact of contacts) {
      if (!contact.email || !contact.phone) {
        failed++;
        results.push({ email: contact.email || '', name: contact.name || '', phone: contact.phone || '', status: 'failed', error: 'חסר אימייל או טלפון' });
        continue;
      }
      const email = contact.email.toLowerCase().trim();
      const phone = normalizePhone(contact.phone);
      const name = (contact.name || '').trim();

      try {
        const userRecord = allUsers.find(u => u.email?.toLowerCase() === email);
        const allowedRecord = allAllowed.find(a => a.email?.toLowerCase() === email);

        if (userRecord || allowedRecord) {
          // Update User entity if exists
          if (userRecord) {
            const updateData = { phone };
            if (name) {
              updateData.full_name = name;
              updateData.custom_name = name;
            }
            await base44.entities.User.update(userRecord.id, updateData);
          }
          // Update AllowedUser entity if exists
          if (allowedRecord) {
            const allowedUpdate = { phone };
            if (name) allowedUpdate.full_name = name;
            await base44.entities.AllowedUser.update(allowedRecord.id, allowedUpdate);
          }

          // Update advisor assignment if advisor info provided
          const advisor = findAdvisor(contact.advisor_name);
          if (advisor && userRecord) {
            const existingAssignment = allAssignments.find(a =>
              a.client_id === userRecord.id ||
              (a.client_email && a.client_email.toLowerCase() === email)
            );
            if (existingAssignment && existingAssignment.advisor_id !== advisor.id) {
              // Reassign to new advisor
              await base44.entities.ClientAdvisorAssignment.update(existingAssignment.id, {
                advisor_id: advisor.id,
                advisor_email: advisor.email,
              });
              advisorsUpdated++;
            } else if (!existingAssignment) {
              // Create new assignment
              await base44.entities.ClientAdvisorAssignment.create({
                client_id: userRecord.id,
                client_email: email,
                client_name: name || userRecord.full_name || '',
                advisor_id: advisor.id,
                advisor_email: advisor.email,
              });
              advisorsUpdated++;
            }
          }

          updated++;
          results.push({ email, phone, name, status: 'updated', advisor: advisor ? (advisor.custom_name || advisor.full_name) : (contact.advisor_name || '') });
        } else {
          notFound++;
          notFoundClients.push({ email, phone, name, advisor_name: contact.advisor_name || '' });
          results.push({ email, phone, name, status: 'not_found' });
        }
      } catch (e) {
        failed++;
        results.push({ email, phone, name, status: 'failed', error: e.message });
      }
    }

    return Response.json({
      success: true,
      total: contacts.length,
      updated,
      notFound,
      failed,
      advisorsUpdated,
      notFoundClients,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
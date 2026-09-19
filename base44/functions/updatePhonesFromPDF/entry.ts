import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Updates phone numbers for existing users by matching emails from a PDF file.
// The PDF should contain email + phone pairs.
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

    // Extract email+phone pairs from the PDF
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
                email: { type: 'string' },
                phone: { type: 'string' },
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

    // Get all users and allowed users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const allAllowed = await base44.asServiceRole.entities.AllowedUser.list();

    let updated = 0;
    let notFound = 0;
    const results = [];

    for (const contact of contacts) {
      if (!contact.email || !contact.phone) continue;
      const email = contact.email.toLowerCase().trim();
      const phone = contact.phone.trim();

      // Find user by email
      const userRecord = allUsers.find(u => u.email?.toLowerCase() === email);
      const allowedRecord = allAllowed.find(a => a.email?.toLowerCase() === email);

      if (userRecord || allowedRecord) {
        if (userRecord) {
          await base44.asServiceRole.entities.User.update(userRecord.id, { phone });
        }
        if (allowedRecord) {
          await base44.asServiceRole.entities.AllowedUser.update(allowedRecord.id, { phone });
        }
        updated++;
        results.push({ email, phone, status: 'updated', name: userRecord?.full_name || allowedRecord?.full_name || '' });
      } else {
        notFound++;
        results.push({ email, phone, status: 'not_found' });
      }
    }

    return Response.json({
      success: true,
      total: contacts.length,
      updated,
      notFound,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
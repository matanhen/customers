import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Updates phone numbers AND names for existing users by matching emails from a PDF file.
// The PDF should contain name + email + phone columns.
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

    // Extract name+email+phone from the PDF
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
                name: { type: 'string' },
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
    let failed = 0;
    const results = [];
    const notFoundClients = [];

    for (const contact of contacts) {
      if (!contact.email || !contact.phone) {
        failed++;
        results.push({ email: contact.email || '', name: contact.name || '', phone: contact.phone || '', status: 'failed', error: 'חסר אימייל או טלפון' });
        continue;
      }
      const email = contact.email.toLowerCase().trim();
      const phone = contact.phone.trim();
      const name = (contact.name || '').trim();

      try {
        const userRecord = allUsers.find(u => u.email?.toLowerCase() === email);
        const allowedRecord = allAllowed.find(a => a.email?.toLowerCase() === email);

        if (userRecord || allowedRecord) {
          const updateData = { phone };
          if (name) {
            updateData.full_name = name;
            updateData.custom_name = name;
          }

          if (userRecord) {
            await base44.asServiceRole.entities.User.update(userRecord.id, updateData);
          }
          if (allowedRecord) {
            const allowedUpdate = { phone };
            if (name) allowedUpdate.full_name = name;
            await base44.asServiceRole.entities.AllowedUser.update(allowedRecord.id, allowedUpdate);
          }
          updated++;
          results.push({ email, phone, name, status: 'updated', name: name || userRecord?.full_name || allowedRecord?.full_name || '' });
        } else {
          notFound++;
          notFoundClients.push({ email, phone, name });
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
      notFoundClients,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
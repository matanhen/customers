import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Advisor automation webhook — receives the balance / monthly plan PDF together
// with the client's email address as multipart/form-data.
const WEBHOOK_URL = 'https://hook.eu2.make.com/35hh99kar4ooonfpxcf7k22vz1b6xwuu';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only advisors and admins may send documents
    const isAdvisorOrAdmin = user.user_type === 'advisor' || user.user_type === 'admin';
    if (!isAdvisorOrAdmin) {
      return Response.json({ error: 'אין הרשאה לשלוח את הקובץ' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toString().trim();
    const filename = (body.filename || 'document.pdf').toString();
    const pdfBase64 = (body.pdf_base64 || '').toString();

    if (!email) return Response.json({ error: 'חסר אימייל של הלקוח' }, { status: 400 });
    if (!pdfBase64) return Response.json({ error: 'חסר קובץ PDF' }, { status: 400 });

    const binary = atob(pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const form = new FormData();
    form.append('email', email);
    form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const detail = response.status === 410
        ? 'הוובהוק אינו פעיל (410)'
        : `השליחה נכשלה (${response.status})`;
      return Response.json({ error: detail }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
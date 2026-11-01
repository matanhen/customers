import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { findUserByPersonalCode } from '../../shared/userIdentification.ts';

// TEMPORARY diagnostic function — safe to delete.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const out: Record<string, any> = {};
  try {
    const found = await findUserByPersonalCode(base44, body.code || 'ZZZZ', body.phone || '972501112233');
    out.found = found ? { id: found.id, email: found.email, code: found.personal_code } : null;
  } catch (e: any) {
    out.error = e.message;
    out.stack = (e.stack || '').split('\n').slice(0, 5);
  }
  return Response.json(out);
}
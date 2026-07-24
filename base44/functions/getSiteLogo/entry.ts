import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public endpoint — no auth required — used by the Landing page (anonymous
// users) to display the admin-uploaded site logo.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const records = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'logo' });
    const logo_url = records && records[0] ? records[0].logo_url || '' : '';
    return Response.json({ logo_url });
  } catch (error) {
    return Response.json({ logo_url: '' });
  }
});
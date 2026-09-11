import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public endpoint — no auth required — used by the Landing page (anonymous
// users) to display the admin-uploaded site logo.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const [logoRecords, navbarRecords] = await Promise.all([
      base44.asServiceRole.entities.SiteSettings.filter({ key: 'logo' }),
      base44.asServiceRole.entities.SiteSettings.filter({ key: 'navbar_logo' })
    ]);
    const logo_url = logoRecords && logoRecords[0] ? logoRecords[0].logo_url || '' : '';
    const navbar_logo_url = navbarRecords && navbarRecords[0] ? navbarRecords[0].logo_url || '' : '';
    return Response.json({ logo_url, navbar_logo_url });
  } catch (error) {
    return Response.json({ logo_url: '' });
  }
});
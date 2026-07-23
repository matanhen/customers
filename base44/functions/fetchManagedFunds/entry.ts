import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getManagedFundsData } from '../../shared/managedFundFetcher.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow force refresh via body — used by the monthly automation.
    let force = false;
    try {
      const body = await req.json();
      if (body && body.force === true) force = true;
    } catch (_) { /* no body */ }

    const { categories, fetchedAt } = await getManagedFundsData(base44, force);
    return Response.json({ categories, fetchedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
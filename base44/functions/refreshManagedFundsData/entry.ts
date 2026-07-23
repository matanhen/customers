import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getManagedFundsData } from '../../shared/managedFundFetcher.ts';

// Called by the monthly automation on the 30th of each month to refresh the
// ManagedFundData cache for the current month. Runs as a service role (no
// user auth — the platform invokes scheduled automations server-side).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { categories, fetchedAt } = await getManagedFundsData(base44, true);
    const fundCount = categories.reduce(
      (acc, c) => acc + (Array.isArray(c.funds) ? c.funds.length : 0),
      0
    );
    return Response.json({
      success: true,
      monthRefreshed: true,
      fundCount,
      fetchedAt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
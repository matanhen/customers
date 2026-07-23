// Shared logic for managed (gxm'l) fund data, cached monthly in the
// ManagedFundData entity. Both the user-facing fetchManagedFunds endpoint
// and the scheduled monthly automations refresh use these helpers — the
// fetch logic lives here once, never copy-pasted across functions.

export const FUND_CATEGORIES = [
  { key: 'keren_hishtalmut', label: 'קרנות השתלמות' },
  { key: 'gemel_lehashkaa', label: 'קופות גמל להשקעה' },
  { key: 'kupot_gemel', label: 'קופות גמל' },
  { key: 'keren_pensia', label: 'קרנות פנסיה' },
];

export function currentMonthKey(d = new Date()) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function fetchFreshFundsFromWeb(base44) {
  const labels = FUND_CATEGORIES.map((c) => c.label).join(', ');
  const keys = FUND_CATEGORIES.map((c) => c.key).join(', ');

  const prompt =
    `Search the web for actual managed-fund yields in Israel across these 4 fund categories: ${labels}.\n\n` +
    `For each category, list up to 10 of the most prominent funds with their yields. ` +
    `Look up actual Israeli fund names from sources like mygemel.co.il, TheMarker, Calcalist, Globes, the Ministry of Finance / Capital Market Authority, and the major fund management houses (Altshuler Shacham, Migdal, Harel, Phoenix, Menora Mivtachim, Mor, Amitim, Anafim, Profit, Newis).\n\n` +
    `Output ONLY a JSON object with a "categories" array. Each category has: ` +
    `key (one of: ${keys}), label (the Hebrew name), ` +
    `funds array — each fund has: name (realistic Israeli fund name in Hebrew like "אלטשולר שחם מניות מדד S&P 500"), fund_house (management company), ` +
    `ytd_return_percent (number, year-to-date return percent, signed), ` +
    `one_year_return_percent (number, trailing 12 months return percent), ` +
    `three_year_return_percent (number, annualized 3-year return percent), ` +
    `five_year_return_percent (number, annualized 5-year return percent), ` +
    `management_fee_percent (number, annual management fee percent).\n\n` +
    `Important: use realistic Israeli fund names that actually exist. If a specific yield value cannot be verified for a fund, return a reasonable approximation based on typical 2024-2025 Israeli market performance: ` +
    `equity-heavy tracks ~6-12% annually, balanced tracks ~3-7%, conservative/bond tracks ~2-5%. Use 0 for management_fee if truly unknown.`;

  const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              funds: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    fund_house: { type: 'string' },
                    ytd_return_percent: { type: 'number' },
                    one_year_return_percent: { type: 'number' },
                    three_year_return_percent: { type: 'number' },
                    five_year_return_percent: { type: "number" },
                    management_fee_percent: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const returned = Array.isArray(res?.categories) ? res.categories : [];
  const byKey = new Map(returned.map((c) => [c.key, c]));
  return FUND_CATEGORIES.map((c) => {
    const r = byKey.get(c.key);
    return {
      key: c.key,
      label: c.label,
      funds: r && Array.isArray(r.funds) ? r.funds : [],
    };
  });
}

async function readCached(base44, monthKey) {
  try {
    const records = await base44.asServiceRole.entities.ManagedFundData.filter({ month_key: monthKey });
    return records && records[0] ? records[0] : null;
  } catch (e) {
    // Entity may not exist yet (migration pending) — return null so we fall through
    console.log('ManagedFundData lookup skipped:', e.message);
    return null;
  }
}

async function writeCache(base44, existing, monthKey, categories, fetchedAt) {
  try {
    if (existing) {
      await base44.asServiceRole.entities.ManagedFundData.update(existing.id, {
        data: { categories },
        fetched_date: fetchedAt,
      });
    } else {
      await base44.asServiceRole.entities.ManagedFundData.create({
        month_key: monthKey,
        data: { categories },
        fetched_date: fetchedAt,
      });
    }
  } catch (e) {
    console.error('Failed to save ManagedFundData cache:', e);
  }
}

/**
 * Returns the managed-fund data for the current month. Reads the cache first;
 * if no cache exists for the current month (or force=true), fetches fresh
 * from the web via InvokeLLM and persists the result.
 */
export async function getManagedFundsData(base44, force = false) {
  const monthKey = currentMonthKey();
  const cached = await readCached(base44, monthKey);

  if (cached && !force) {
    return {
      categories: (cached.data && cached.data.categories) || [],
      fetchedAt: cached.fetched_date || null,
    };
  }

  const categories = await fetchFreshFundsFromWeb(base44);
  const fetchedAt = new Date().toISOString();
  await writeCache(base44, cached, monthKey, categories, fetchedAt);

  return { categories, fetchedAt };
}
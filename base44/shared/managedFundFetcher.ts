// Shared logic for managed (gxm'l) fund data fetched DIRECTLY from
// https://www.mygemel.net/. Both the user-facing fetchManagedFunds endpoint
// and the monthly automation invoke these helpers — the fetch logic lives
// here once, never copy-pasted across functions.
//
// Approach: for each fund-type page on mygemel.net we fetch the server-rendered
// HTML and ask the LLM to extract every yields comparison table on the page
// into structured JSON (route -> funds with returns). Result is cached in the
// ManagedFundData entity keyed by YYYY-MM and refreshed monthly on the 30th.

export const FUND_TYPES = [
  { key: 'keren_hishtalmut', label: 'קרנות השתלמות',   url: 'https://www.mygemel.net/קרנות-השתלמות' },
  { key: 'gemel_lehashkaa',  label: 'קופת גמל להשקעה', url: 'https://www.mygemel.net/קופת-גמל-להשקעה' },
  { key: 'kupot_gemel',      label: 'קופות גמל',       url: 'https://www.mygemel.net/קופות-גמל' },
  { key: 'keren_pensia',    label: 'קרנות פנסיה',      url: 'https://www.mygemel.net/פנסיה' },
  { key: 'polisot_hisachon', label: 'פוליסות חיסכון', url: 'https://www.mygemel.net/פוליסות-חיסכון' },
];

export function currentMonthKey(d = new Date()) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function fetchHtml(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}

async function fetchFundTypeData(base44, ft) {
  let html = '';
  try {
    html = await fetchHtml(ft.url);
  } catch (e) {
    console.error(`Failed to fetch ${ft.url}: ${e.message}`);
    return { key: ft.key, label: ft.label, source_url: ft.url, routes: [], error: e.message };
  }

  const prompt =
    `Below is raw HTML from mygemel.net for the "${ft.label}" comparison page. Extract ALL yields comparison tables on this page into structured JSON.\n\n` +
    `Each table on the page is a markdown-style table preceded by a Hebrew heading such as "קרנות השתלמות מובילות באפיק כללי". ` +
    `Table rows show: | שם (fund name with link) | monthly column (e.g. "יוני"/current month) | "שנה" (year) | "3 שנים" | "5 שנים" |. ` +
    `At the bottom of each table is a "תשואה ממוצעת לקבוצה" average row — EXCLUDE this row.\n\n` +
    `For each table return one entry in "routes" with:\n` +
    `- key: an English camelCase slug derived from the heading (e.g. "klali", "manyati", "sp500Index", "untilAge50", "untilAge50to60", "untilAge60Plus").\n` +
    `- label: the Hebrew heading text that prefaces the table (e.g. "קרנות השתלמות מובילות באפיק כללי" or "פנסיה מקיפה מסלול לבני 50 ומטה").\n` +
    `- columns: array of exactly 5 Hebrew column labels from the table header (e.g. ["שם","יוני","שנה","3 שנים","5 שנים"]).\n` +
    `- funds: array of all fund rows EXCEPT the "תשואה ממוצעת לקבוצה" average row. Each fund has:\n` +
    `   * rank: numeric ranking within that table (1 = top),\n` +
    `   * name: Hebrew fund name (extract from link text or cell text),\n` +
    `   * ytd: monthly column value (number, signed percent, e.g. -0.57 means -0.57%),\n` +
    `   * year: 1-year return (signed percent number),\n` +
    `   * three_year: 3-year cumulative return (signed percent; null if cell empty),\n` +
    `   * five_year: 5-year return (signed percent; null if cell empty).\n\n` +
    `HTML content:\n\n${html}\n\nReturn JSON with exactly one key "routes" array.`;

  let res = null;
  try {
    res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          routes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                label: { type: 'string' },
                columns: { type: 'array', items: { type: 'string' } },
                funds: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rank: { type: 'number' },
                      name: { type: 'string' },
                      ytd: { type: 'number' },
                      year: { type: 'number' },
                      three_year: { type: 'number' },
                      five_year: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (e) {
    console.error(`LLM parsing failed for ${ft.key}: ${e.message}`);
    return { key: ft.key, label: ft.label, source_url: ft.url, routes: [], error: e.message };
  }

  const routes = Array.isArray(res?.routes) ? res.routes : [];
  return { key: ft.key, label: ft.label, source_url: ft.url, routes };
}

async function readCached(base44, monthKey) {
  try {
    const records = await base44.asServiceRole.entities.ManagedFundData.filter({ month_key: monthKey });
    return records && records[0] ? records[0] : null;
  } catch (e) {
    console.log('ManagedFundData lookup skipped:', e.message);
    return null;
  }
}

async function writeCache(base44, existing, monthKey, data, fetchedAt) {
  try {
    if (existing) {
      await base44.asServiceRole.entities.ManagedFundData.update(existing.id, {
        data,
        fetched_date: fetchedAt,
      });
    } else {
      await base44.asServiceRole.entities.ManagedFundData.create({
        month_key: monthKey,
        data,
        fetched_date: fetchedAt,
      });
    }
  } catch (e) {
    console.error('Failed to save ManagedFundData cache:', e);
  }
}

/**
 * Returns the managed-fund data for the current month. Reads the cache first;
 * if no cache exists for the current month, OR the cached record was stored in
 * the legacy "categories" schema, OR force=true — fetches fresh from
 * mygemel.net and persists the result.
 */
export async function getManagedFundsData(base44, force = false) {
  const monthKey = currentMonthKey();
  const cached = await readCached(base44, monthKey);

  // Force a fresh fetch if the cache holds the old "categories" schema so
  // we never surface stale fabricated data to users after the schema change.
  let effectiveForce = force;
  if (cached && !force && !cached.data?.fund_types) effectiveForce = true;

  if (cached && !effectiveForce) {
    return {
      fund_types: cached.data && cached.data.fund_types ? cached.data.fund_types : [],
      fetchedAt: cached.fetched_date || null,
    };
  }

  // Fetch each fund-type page in parallel and let the LLM extract tables.
  const fundTypes = await Promise.all(
    FUND_TYPES.map((ft) => fetchFundTypeData(base44, ft))
  );

  const fetchedAt = new Date().toISOString();
  await writeCache(base44, cached, monthKey, { fund_types: fundTypes }, fetchedAt);

  return { fund_types: fundTypes, fetchedAt };
}
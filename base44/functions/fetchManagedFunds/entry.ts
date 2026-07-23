import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Static list of the 4 fund categories displayed in the
// "תשואות קופות מנוהלות" tab. The LLM is asked to fill funds[] per category
// from data published on mygemel.co.il.
const FUND_CATEGORIES = [
  { key: 'keren_hishtalmut', label: 'קרנות השתלמות' },
  { key: 'gemel_lehashkaa', label: 'קופות גמל להשקעה' },
  { key: 'kupot_gemel', label: 'קופות גמל' },
  { key: 'keren_pensia', label: 'קרנות פנסיה' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Optional body: pass an array of category keys to limit the response.
    let categories = FUND_CATEGORIES;
    try {
      const body = await req.json();
      if (body && Array.isArray(body.categoryKeys) && body.categoryKeys.length > 0) {
        const set = new Set(body.categoryKeys);
        categories = FUND_CATEGORIES.filter((c) => set.has(c.key));
      }
    } catch (_) { /* default to all categories */ }

    const labels = categories.map((c) => c.label).join(', ');

    const prompt =
      `חפש והחזר את נתוני טבלאות ההשוואה המתפרסמות באתר "mygemel" (כתובת: https://www.mygemel.co.il / https://mygemel.co.il) עבור 4 קטגוריות קופות: ${labels}.\n\n` +
      `עבור כל קטגוריה, אסוף את הקופות/קרנות המובילות עם הנתונים הבאים:\n` +
      `  - name (שם הקופה)\n` +
      `  - fund_house (הגוף המנהל — חברת ההשתלמות או הביטוח)\n` +
      `  - ytd_return_percent (תשואה מתחילת השנה, מספר)\n` +
      `  - one_year_return_percent (תשואה ב-12 חודשים אחרונים)\n` +
      `  - three_year_return_percent (תשואה ממוצעת 3 שנים)\n` +
      `  - five_year_return_percent (תשואה ממוצעת 5 שנים)\n` +
      `  - management_fee_percent (דמי ניהול שנתיים, מספר)\n\n` +
      `חשוב: רק ערכים שנמצאים בפועל באתר. אם לא ניתן להשיג ערך מספרי — מלא 0 או השמט, אך אל תמציא מספרים. החזר מערך funds ריק עבור קטגוריה שלא מצליחה.\n\n` +
      `החזר אובייקט JSON בלבד עם מפתח "categories" — מערך אובייקטים, אחד לכל קטגוריה, עם שדות key, label (בעברית) ו-funds (מערך).`;

    const res = await base44.integrations.Core.InvokeLLM({
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
                      five_year_return_percent: { type: 'number' },
                      management_fee_percent: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Normalize: ensure each registered category has a slot even if LLM omitted it.
    const returned = Array.isArray(res?.categories) ? res.categories : [];
    const byKey = new Map(returned.map((c) => [c.key, c]));

    return Response.json({
      categories: categories.map((c) => {
        const r = byKey.get(c.key);
        return {
          key: c.key,
          label: c.label,
          funds: r && Array.isArray(r.funds) ? r.funds : [],
        };
      }),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
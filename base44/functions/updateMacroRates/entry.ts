import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `מצא את הנתונים הרשמיים והמעודכנים ביותר בישראל מבנק ישראל ומהלשכה המרכזית לסטטיסטיקה (למ"ס):
1. ריבית בנק ישראל (ריבית הוועד המוניטרי) באחוזים.
2. מדד המחירים לצרכן - אינפלציה שנתית (12 החודשים האחרונים) באחוזים.
החזר מספרים עשרוניים בלבד ללא סימן האחוז. הסתמך אך ורק על מקורות רשמיים.
בשדה source_text, ציין את שם המקור ואת תאריך הפרסום האחרון, בעברית.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          bank_of_israel_rate: { type: 'number', description: 'ריבית בנק ישראל באחוזים' },
          inflation_rate: { type: 'number', description: 'אינפלציה שנתית 12 חודשים באחוזים' },
          source_text: { type: 'string', description: 'מקור הנתונים ותאריך פרסום בעברית' }
        },
        required: ['bank_of_israel_rate', 'inflation_rate']
      }
    });

    const boi = Number(result.bank_of_israel_rate) || 0;
    const inflation = Number(result.inflation_rate) || 0;
    // Prime rate is always Bank of Israel rate + 1.5%
    const prime = Math.round((boi + 1.5) * 100) / 100;

    const reportMonth = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit'
    }).format(new Date());

    const existing = await base44.asServiceRole.entities.MacroRates.list();
    let record;
    if (existing.length > 0) {
      record = await base44.asServiceRole.entities.MacroRates.update(existing[0].id, {
        bank_of_israel_rate: boi,
        prime_rate: prime,
        inflation_rate: inflation,
        report_month: reportMonth,
        source_text: result.source_text || ''
      });
    } else {
      record = await base44.asServiceRole.entities.MacroRates.create({
        bank_of_israel_rate: boi,
        prime_rate: prime,
        inflation_rate: inflation,
        report_month: reportMonth,
        source_text: result.source_text || ''
      });
    }

    return Response.json({
      success: true,
      bank_of_israel_rate: boi,
      prime_rate: prime,
      inflation_rate: inflation,
      report_month: reportMonth,
      record
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only inflation is fetched automatically. Bank of Israel rate and prime
    // rate are managed manually by the admin (via the Admin Dashboard) and must
    // NOT be overwritten by this scheduled refresh.
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `מצא את הנתון הרשמי והמעודכן ביותר מהלשכה המרכזית לסטטיסטיקה (למ"ס) בישראל:
מדד המחירים לצרכן - אינפלציה שנתית (12 החודשים האחרונים) באחוזים.
החזר מספר עשרוני בלבד ללא סימן האחוז. הסתמך אך ורק על מקורות רשמיים.
בשדה source_text, ציין את שם המקור ואת תאריך הפרסום האחרון, בעברית.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          inflation_rate: { type: 'number', description: 'אינפלציה שנתית 12 חודשים באחוזים' },
          source_text: { type: 'string', description: 'מקור הנתונים ותאריך פרסום בעברית' }
        },
        required: ['inflation_rate']
      }
    });

    const inflation = Number(result.inflation_rate) || 0;

    const existing = await base44.asServiceRole.entities.MacroRates.list();
    const sorted = (existing || []).sort((a, b) =>
      String(b.updated_date || '').localeCompare(String(a.updated_date || ''))
    );
    const latest = sorted[0];

    let record;
    if (latest) {
      // Update only inflation + source; preserve admin-managed boi/prime/report_month
      record = await base44.asServiceRole.entities.MacroRates.update(latest.id, {
        inflation_rate: inflation,
        source_text: result.source_text || '',
      });
    } else {
      record = await base44.asServiceRole.entities.MacroRates.create({
        bank_of_israel_rate: 0,
        prime_rate: 0,
        inflation_rate: inflation,
        report_month: '',
        source_text: result.source_text || '',
      });
    }

    return Response.json({
      success: true,
      inflation_rate: inflation,
      record,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
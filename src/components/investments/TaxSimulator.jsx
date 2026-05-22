import React, { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const TAX_RATE = 0.25;

function formatMoney(n) {
  const abs = Math.abs(n).toLocaleString('he-IL');
  return n < 0 ? `-₪${abs}` : `₪${abs}`;
}

export default function TaxSimulator() {
  const [securities, setSecurities] = useState([
    { id: 1, name: '', profitLoss: '', selected: true }
  ]);
  const [nextId, setNextId] = useState(2);

  const addSecurity = () => {
    setSecurities(prev => [...prev, { id: nextId, name: '', profitLoss: '', selected: true }]);
    setNextId(n => n + 1);
  };

  const removeSecurity = (id) => {
    setSecurities(prev => prev.filter(s => s.id !== id));
  };

  const updateSecurity = (id, field, value) => {
    setSecurities(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleSelected = (id) => {
    setSecurities(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  // Only calculate for selected securities with valid values
  const selectedWithValues = securities.filter(s => s.selected && s.profitLoss !== '' && !isNaN(parseFloat(s.profitLoss)));

  const totalProfitLoss = selectedWithValues.reduce((sum, s) => sum + parseFloat(s.profitLoss), 0);
  const totalTaxImpact = -(totalProfitLoss * TAX_RATE); // positive = refund, negative = you owe
  // If totalProfitLoss > 0: you owe tax (negative impact on cash)
  // If totalProfitLoss < 0: you get refund (positive impact on cash)

  const profitSecurities = selectedWithValues.filter(s => parseFloat(s.profitLoss) > 0);
  const lossSecurities = selectedWithValues.filter(s => parseFloat(s.profitLoss) < 0);

  const totalProfit = profitSecurities.reduce((sum, s) => sum + parseFloat(s.profitLoss), 0);
  const totalLoss = lossSecurities.reduce((sum, s) => sum + parseFloat(s.profitLoss), 0);

  const taxOnProfits = totalProfit * TAX_RATE;
  const refundFromLosses = Math.abs(totalLoss) * TAX_RATE;
  const netCashEffect = refundFromLosses - taxOnProfits; // positive = net refund, negative = net payment

  const hasData = selectedWithValues.length > 0;

  const getRecommendation = () => {
    if (!hasData) return null;

    if (netCashEffect > 0) {
      return {
        type: 'positive',
        title: 'מומלץ למכור עכשיו!',
        message: `מכירת הניירות הנבחרים תניב לך החזר מס של ${formatMoney(netCashEffect)}. 
ניתן לקנות מחדש את אותם ניירות מיד לאחר המכירה (לאחר דקה) — ותישאר עם ${formatMoney(netCashEffect)} יותר מזומן בתיק.`
      };
    }

    if (netCashEffect === 0) {
      return {
        type: 'neutral',
        title: 'אפקט אפס',
        message: 'הרווחים וההפסדים מתקזזים בדיוק. אין חיסכון מס, אך גם אין תשלום. כדאי לשקול מכירת ניירות הפסד בלבד להפחתת חשיפת מס.'
      };
    }

    // netCashEffect < 0 — you owe tax
    if (lossSecurities.length > 0 && profitSecurities.length > 0) {
      const partialSaleProfit = Math.abs(totalLoss); // sell profits only up to loss amount = zero tax
      return {
        type: 'warning',
        title: 'שים לב — יש תשלום מס',
        message: `מכירת כל הניירות הנבחרים תגרור תשלום מס של ${formatMoney(Math.abs(netCashEffect))}.
💡 המלצה: מכור את ניירות ההפסד (${formatMoney(totalLoss)}) ובמקביל מכור רווחים בסכום של עד ${formatMoney(partialSaleProfit)} בלבד — כך תקזז את המס לאפס.
אפשרות נוספת: ממש רק חלק מהרווחים עד לגובה ההפסדים וכך לשלם אפס מס.`
      };
    }

    if (profitSecurities.length > 0 && lossSecurities.length === 0) {
      return {
        type: 'warning',
        title: 'יש רווחים — שים לב למס',
        message: `מכירת הניירות הנבחרים תחייב תשלום מס רווח הון של ${formatMoney(taxOnProfits)}.
💡 אם יש לך ניירות הפסד אחרים — הוסף אותם לסימולטור לקיזוז המס.
אם לא, שקול לדחות את המכירה לשנה הבאה או למכור בחלקים.`
      };
    }

    return {
      type: 'positive',
      title: 'כדאי למכור את ניירות ההפסד',
      message: `מכירת ניירות ההפסד הנבחרים תחזיר לך ${formatMoney(refundFromLosses)} בהחזר מס. ניתן לקנות מחדש לאחר דקה.`
    };
  };

  const recommendation = getRecommendation();

  const recColors = {
    positive: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    neutral: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Info banner */}
      <Card className="border-0 shadow-sm bg-[#105330]/5">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-5 h-5 text-[#105330] shrink-0 mt-0.5" />
          <p className="text-sm text-[#105330]/80 leading-relaxed">
            הסימולטור בודק האם כדאי לך למכור ניירות ערך לצורך חיסכון במס (Tax Loss Harvesting). 
            הזן רווח כמספר חיובי (+) והפסד כמספר שלילי (−). 
            סמן את הניירות שברצונך לבדוק.
          </p>
        </CardContent>
      </Card>

      {/* Securities input */}
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[#105330]">ניירות ערך</CardTitle>
          <Button
            onClick={addSecurity}
            size="sm"
            className="bg-[#105330] hover:bg-[#0d4027] text-white rounded-xl"
          >
            <Plus className="w-4 h-4 ml-1" />
            הוסף נייר ערך
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-[#105330]/60 px-1">
            <div className="col-span-1">בחר</div>
            <div className="col-span-5">שם נייר / מספר נייר</div>
            <div className="col-span-5">רווח / הפסד (₪)</div>
            <div className="col-span-1"></div>
          </div>

          {securities.map((sec) => {
            const val = parseFloat(sec.profitLoss);
            const isProfit = !isNaN(val) && val > 0;
            const isLoss = !isNaN(val) && val < 0;
            return (
              <div key={sec.id} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-[#105330]/5 border border-[#105330]/10">
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => toggleSelected(sec.id)} className="text-[#105330]">
                    {sec.selected
                      ? <CheckSquare className="w-5 h-5" />
                      : <Square className="w-5 h-5 opacity-40" />
                    }
                  </button>
                </div>
                <div className="col-span-5">
                  <Input
                    placeholder="שם / מס' נייר"
                    value={sec.name}
                    onChange={(e) => updateSecurity(sec.id, 'name', e.target.value)}
                    className="rounded-lg border-[#105330]/20 text-sm"
                  />
                </div>
                <div className="col-span-5">
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="לדוגמה: 8000 או -10000"
                      value={sec.profitLoss}
                      onChange={(e) => updateSecurity(sec.id, 'profitLoss', e.target.value)}
                      className={`rounded-lg border-[#105330]/20 text-sm pl-8 ${isProfit ? 'text-green-700' : isLoss ? 'text-red-600' : ''}`}
                    />
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                      {isProfit && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {isLoss && <TrendingDown className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => removeSecurity(sec.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Results */}
      {hasData && (
        <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#c8a863] to-[#d4b87a]" />
          <CardHeader>
            <CardTitle className="text-[#105330]">תוצאות הסימולציה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary rows */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                <p className="text-xs text-green-600 font-medium mb-1">סה״כ רווחים</p>
                <p className="text-xl font-bold text-green-700">{formatMoney(totalProfit)}</p>
                {totalProfit > 0 && (
                  <p className="text-xs text-green-600 mt-1">מס לתשלום: {formatMoney(taxOnProfits)}</p>
                )}
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                <p className="text-xs text-red-600 font-medium mb-1">סה״כ הפסדים</p>
                <p className="text-xl font-bold text-red-600">{formatMoney(totalLoss)}</p>
                {totalLoss < 0 && (
                  <p className="text-xs text-red-500 mt-1">החזר מס: {formatMoney(refundFromLosses)}</p>
                )}
              </div>
              <div className={`p-4 rounded-xl text-center border ${netCashEffect >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`text-xs font-medium mb-1 ${netCashEffect >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {netCashEffect >= 0 ? 'החזר נטו למזומן' : 'תשלום מס נטו'}
                </p>
                <p className={`text-2xl font-bold ${netCashEffect >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {netCashEffect >= 0 ? '+' : ''}{formatMoney(netCashEffect)}
                </p>
                <p className={`text-xs mt-1 ${netCashEffect >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {netCashEffect >= 0 ? 'יכנס לחשבון בעת מכירה' : 'יחויב בעת מכירה'}
                </p>
              </div>
            </div>

            {/* Per-security breakdown */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#105330]">פירוט לפי נייר ערך:</p>
              {selectedWithValues.map((s) => {
                const val = parseFloat(s.profitLoss);
                const tax = -(val * TAX_RATE);
                const isProfit = val > 0;
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                    <span className="font-medium text-slate-700">{s.name || 'נייר ללא שם'}</span>
                    <div className="flex items-center gap-3">
                      <Badge className={isProfit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {isProfit ? 'רווח' : 'הפסד'}: {formatMoney(val)}
                      </Badge>
                      <span className={`font-semibold text-xs ${isProfit ? 'text-red-500' : 'text-green-600'}`}>
                        {isProfit ? `מס: ${formatMoney(Math.abs(tax))}` : `החזר: +${formatMoney(Math.abs(tax))}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            {recommendation && (
              <div className={`p-4 rounded-xl border-2 ${recColors[recommendation.type]}`}>
                <p className="font-bold text-base mb-2">💡 {recommendation.title}</p>
                <p className="text-sm leading-relaxed whitespace-pre-line">{recommendation.message}</p>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center">
              * הסימולטור מבוסס על מס רווח הון של 25%. אין באמור ייעוץ מס. מומלץ להתייעץ עם רואה חשבון.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
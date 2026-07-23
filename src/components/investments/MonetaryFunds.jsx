import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Coins, Info } from 'lucide-react';
import FormattedNumberInput from '@/components/ui/FormattedNumberInput';
import { base44 } from '@/api/base44Client';

// Snapshot of the funds table from https://lazyinvestor.co.il/monetary-fund/
// Updated June 2026.
const FUNDS = [
  { paper: '5138763', name: 'אלטשולר שחם כספית',                   mgmt2026: '0.234%', yield2026: '1.72%', yield2025: '4.41%', mgmt2025: '0.175%' },
  { paper: '5137740', name: 'קסם אקטיב כספית שקלית',                 mgmt2026: '0.19%',  yield2026: '1.72%', yield2025: '4.44%', mgmt2025: '0.14%' },
  { paper: '5136544', name: 'מיטב כספית שקלית כשרה',                mgmt2026: '0.16%',  yield2026: '1.82%', yield2025: '4.57%', mgmt2025: '0.14%' },
  { paper: '5137732', name: 'אי.בי.אי. כספית ניהול נזילות',          mgmt2026: '0.169%', yield2026: '1.75%', yield2025: '4.49%', mgmt2025: '0.169%' },
  { paper: '5138094', name: 'מגדל כספית שקלית כשרה',                mgmt2026: '0.149%', yield2026: '1.80%', yield2025: '4.46%', mgmt2025: '0.09%' },
  { paper: '5138698', name: 'דולפין כספית',                         mgmt2026: '0.149%', yield2026: '1.75%', yield2025: '4.47%', mgmt2025: '0.09%' },
  { paper: '5137815', name: 'הראל כספית שקלית כשרה',                mgmt2026: '0.14%',  yield2026: '1.68%', yield2025: '4.39%', mgmt2025: '0.10%' },
  { paper: '5139324', name: 'מור כספית ניהול נזילות',              mgmt2026: '0.15%',  yield2026: '1.82%', yield2025: '4.42%', mgmt2025: '0.10%' },
  { paper: '5137690', name: 'מיטב כספית שקלית ללא קונצרני',         mgmt2026: '0.14%',  yield2026: '1.63%', yield2025: '4.25%', mgmt2025: '0.08%' },
  { paper: '5136874', name: 'קסם אקטיב כספית',                      mgmt2026: '0.24%',  yield2026: '1.71%', yield2025: '4.50%', mgmt2025: '0.19%' },
  { paper: '5137641', name: 'ילין לפידות כספית',                    mgmt2026: '0.22%',  yield2026: '1.81%', yield2025: '4.59%', mgmt2025: '0.19%' },
  { paper: '5136866', name: 'איילון כספית ניהול הנזילות',            mgmt2026: '0.18%',  yield2026: '1.74%', yield2025: '4.49%', mgmt2025: '0.14%' },
  { paper: '5138706', name: 'אזימוט כספית',                         mgmt2026: '0.14%',  yield2026: '1.75%', yield2025: '4.45%', mgmt2025: '0.14%' },
  { paper: '5121140', name: 'אנליסט כספית',                        mgmt2026: '0.215%', yield2026: '1.71%', yield2025: '4.46%', mgmt2025: '0.185%' },
  { paper: '5127881', name: 'קסם אקטיב כספית פטורה',               mgmt2026: '0.24%',  yield2026: '1.72%', yield2025: '4.46%', mgmt2025: '0.19%' },
  { paper: '5129408', name: 'הראל כספית ניהול נזילות',             mgmt2026: '0.17%',  yield2026: '1.72%', yield2025: '4.43%', mgmt2025: '0.17%' },
  { paper: '5117700', name: 'איילון כספית',                         mgmt2026: '0.18%',  yield2026: '1.77%', yield2025: '4.53%', mgmt2025: '0.18%' },
  { paper: '5134309', name: 'מגדל כספית',                          mgmt2026: '0.239%', yield2026: '1.75%', yield2025: '4.49%', mgmt2025: '0.199%' },
  { paper: '5127790', name: 'הראל כספית מגמת ריבית',                mgmt2026: '0.18%',  yield2026: '1.71%', yield2025: '4.44%', mgmt2025: '0.18%' },
  { paper: '5105820', name: 'אלטשולר שחם כספית ללא קונצרני',        mgmt2026: '0.21%',  yield2026: '1.62%', yield2025: '4.16%', mgmt2025: '0.19%' },
  { paper: '5119409', name: 'הראל כספית שקלית',                     mgmt2026: '0.19%',  yield2026: '1.69%', yield2025: '4.42%', mgmt2025: '0.19%' },
  { paper: '5119813', name: 'מור כספית',                            mgmt2026: '0.24%',  yield2026: '1.74%', yield2025: '4.43%', mgmt2025: '0.22%' },
  { paper: '5102991', name: 'מגדל כספית שקלית',                     mgmt2026: '0.239%', yield2026: '1.70%', yield2025: '4.48%', mgmt2025: '0.219%' },
  { paper: '5103510', name: 'אי.בי.אי. כספית שקלית',               mgmt2026: '0.20%',  yield2026: '1.75%', yield2025: '4.46%', mgmt2025: '0.20%' },
  { paper: '5135926', name: 'מיטב כספית ניהול נזילות',              mgmt2026: '0.22%',  yield2026: '1.88%', yield2025: '4.55%', mgmt2025: '0.22%' },
  { paper: '5123898', name: 'מיטב כספית',                            mgmt2026: '0.25%',  yield2026: '1.84%', yield2025: '4.55%', mgmt2025: '0.25%' },
  { paper: '5137559', name: 'מגדל כספית מחלקת חודשי',               mgmt2026: '0.16%',  yield2026: '1.49%', yield2025: '3.64%', mgmt2025: '0.07%' },
  { paper: '5139522', name: 'אי.בי.אי כספית שקלית כשרה',           mgmt2026: '0.149%', yield2026: '1.78%', yield2025: '4.54%', mgmt2025: '0.09%' },
  { paper: '5139258', name: 'ילין לפידות כספית ניהול נזילות',        mgmt2026: '0.19%',  yield2026: '1.79%', yield2025: '4.61%', mgmt2025: '0.07%' },
  { paper: '5140918', name: 'אלטשולר שחם כספית ניהול נזילות',         mgmt2026: '0.06%',  yield2026: '1.78%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141692', name: 'ברק כספית',                            mgmt2026: '0% + 0.1% מההפקדה', yield2026: '1.70%', yield2025: '—', mgmt2025: '—' },
  { paper: '5140785', name: 'מגדל כספית שקלית ללא קונצרני',         mgmt2026: '0.06%',  yield2026: '1.67%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141353', name: 'פורסט כספית',                          mgmt2026: '0.05%',  yield2026: '1.77%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141304', name: 'מגדל כספית חסכון',                     mgmt2026: '0.10%',  yield2026: '1.66%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141098', name: 'דולפין כספית שקלית',                   mgmt2026: '0.05%',  yield2026: '1.75%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5140413', name: 'אנליסט כספית חיסכון',                  mgmt2026: '0.12%',  yield2026: '1.78%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141452', name: 'ילין לפידות כספית כשרה',               mgmt2026: '0.06%',  yield2026: '1.96%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141296', name: 'מיטב כספית ג׳מבו',                    mgmt2026: '0.12%',  yield2026: '1.96%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141197', name: 'אי.בי.אי כספית חסכון',                mgmt2026: '0.07%',  yield2026: '1.77%', yield2025: '—',    mgmt2025: '—' },
];

const TAX_RATE = 0.25;

function formatShekel(n, decimals = 0) {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export default function MonetaryFunds() {
  const [depositDate, setDepositDate] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCalc = async () => {
    setError('');
    setResult(null);

    if (!depositDate || !saleDate) {
      setError('יש להזין תאריך הפקדה ותאריך מכירה.');
      return;
    }
    if (new Date(saleDate) < new Date(depositDate)) {
      setError('תאריך המכירה חייב להיות אחרי תאריך ההפקדה.');
      return;
    }
    if (!depositAmount || !currentAmount) {
      setError('יש להזין סכום הפקדה וצבירה נוכחית.');
      return;
    }

    setLoading(true);
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const effectiveSale = saleDate > todayISO ? todayISO : saleDate;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          `Compute the cumulative inflation in Israel between two dates using the official monthly Consumer Price Index (CPI / מדד המחירים לצרכן) published by the Israeli Central Bureau of Statistics (LAM). Compound the monthly CPI percentage changes for the months fully or partially included between the deposit date and the sale date. If the sale date is in the future or in a month whose CPI has not yet been published, use the most recent published CPI month as the end month.\n` +
          `Deposit date: ${depositDate}\n` +
          `Sale date: ${effectiveSale}\n` +
          `Return ONLY the cumulative inflation as a percentage number in the JSON object.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            cumulative_inflation_percent: { type: 'number' },
          },
        },
      });

      const inflationPercent = res.cumulative_inflation_percent ?? 0;
      const inflationFactor = 1 + inflationPercent / 100;
      const inflationAdjustedDeposit = depositAmount * inflationFactor;
      const realProfit = currentAmount - inflationAdjustedDeposit;
      const tax = Math.max(0, realProfit * TAX_RATE);
      const profitBeforeInflationAdjust = currentAmount - depositAmount;
      const netAfterTax = currentAmount - tax;

      setResult({
        inflationPercent,
        inflationAdjustedDeposit,
        realProfit,
        tax,
        profitBeforeInflationAdjust,
        netAfterTax,
      });
    } catch (e) {
      console.error(e);
      setError('נכשל בחישוב האינפלציה מול מדד המחירים. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Funds table */}
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
        <CardHeader>
          <CardTitle className="text-[#105330]">רשימת קרנות כספיות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#105330]/5 text-[#105330] text-right">
                  <th className="px-3 py-2 font-semibold">מס׳ נייר</th>
                  <th className="px-3 py-2 font-semibold">שם הקרן</th>
                  <th className="px-3 py-2 font-semibold">דמי ניהול 2026</th>
                  <th className="px-3 py-2 font-semibold">תשואה 2026</th>
                  <th className="px-3 py-2 font-semibold">תשואה 2025</th>
                  <th className="px-3 py-2 font-semibold">דמי ניהול 2025</th>
                </tr>
              </thead>
              <tbody>
                {FUNDS.map((f, idx) => (
                  <tr
                    key={f.paper}
                    className={`border-b border-[#105330]/10 ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : ''}`}
                  >
                    <td className="px-3 py-2 text-slate-600 dir-ltr text-right">{f.paper}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{f.name}</td>
                    <td className="px-3 py-2 text-slate-700">{f.mgmt2026}</td>
                    <td className="px-3 py-2 text-green-700 font-medium">{f.yield2026}</td>
                    <td className="px-3 py-2 text-slate-700">{f.yield2025}</td>
                    <td className="px-3 py-2 text-slate-700">{f.mgmt2025}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">הטבלה מתעדכנת אחת לחודש. מקור: lazyinvestor.co.il.</p>
        </CardContent>
      </Card>

      {/* Tax calculator */}
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#c8a863] to-[#d4b87a]" />
        <CardHeader>
          <CardTitle className="text-[#105330] flex items-center gap-2">
            <Coins className="w-5 h-5" />
            מחשבון מס לקרן כספית
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[#105330]/5 rounded-xl p-3 flex gap-2">
            <Info className="w-4 h-4 text-[#105330] shrink-0 mt-0.5" />
            <p className="text-xs text-[#105330]/80 leading-relaxed">
              המיסוי על קרן כספית הוא ריאלי: משלמים מס בגובה 25% רק על הרווח שעוקף את האינפלציה.
              האינפלציה המצטברת מחושבת אוטומטית בלי הצורך להזין ידנית — על בסיס תאריכי ההפקדה ומכירה ומדד המחירים לצרכן (CBS).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">תאריך הפקדה</Label>
              <Input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">תאריך מכירה</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">סכום הפקדה (₪)</Label>
              <FormattedNumberInput
                value={depositAmount}
                onChange={setDepositAmount}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">צבירה נוכחית (₪)</Label>
              <FormattedNumberInput
                value={currentAmount}
                onChange={setCurrentAmount}
                placeholder="0"
              />
            </div>
          </div>

          <Button
            onClick={handleCalc}
            disabled={loading}
            className="bg-[#105330] hover:bg-[#0d4027] w-full md:w-auto"
          >
            {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
            {loading ? 'מחשב אינפלציה...' : 'חשב לי כמה מס אשלם'}
          </Button>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <p className="text-xs text-blue-600 mb-1">אינפלציה מצטברת</p>
                  <p className="text-xl font-bold text-blue-700">
                    {result.inflationPercent.toFixed(2)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">סכום הפקדה מוצמד</p>
                  <p className="text-lg font-bold text-slate-700">
                    {formatShekel(result.inflationAdjustedDeposit)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-1">רווח נומינלי (בלי הצמדה)</p>
                  <p className="text-lg font-bold text-slate-700">
                    {formatShekel(result.profitBeforeInflationAdjust)}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl border text-center col-span-2 sm:col-span-3 ${
                    result.realProfit > 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p
                    className={`text-xs mb-1 ${
                      result.realProfit > 0 ? 'text-green-600' : 'text-slate-500'
                    }`}
                  >
                    רווח ריאלי (מסומן אחרי הצמדה למדד)
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      result.realProfit > 0 ? 'text-green-700' : 'text-slate-700'
                    }`}
                  >
                    {formatShekel(result.realProfit)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center col-span-2 sm:col-span-3">
                  <p className="text-xs text-red-600 mb-1">מס לתשלום (25%)</p>
                  <p className="text-2xl font-bold text-red-700">{formatShekel(result.tax)}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center col-span-2 sm:col-span-3">
                  <p className="text-xs text-emerald-600 mb-1">נטו אחרי מס</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatShekel(result.netAfterTax)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                האינפלציה מחושבת אוטומטית מתוך נתוני מדד המחירים לצרכן הרשמיים. אין בכך ייעוץ מס.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
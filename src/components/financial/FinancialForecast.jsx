import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Rocket, Target, Info } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

// Future value of annuity: FV = PMT * [(1+r)^n - 1] / r
function calcFutureValueAnnuity(monthlyAmount, annualReturnRate, years) {
  if (monthlyAmount === 0) return 0;
  const r = annualReturnRate / 12;
  const n = years * 12;
  if (r === 0) return monthlyAmount * n;
  return monthlyAmount * ((Math.pow(1 + r, n) - 1) / r);
}

// Debt growth: D * (1+r)^n + PMT * [(1+r)^n - 1] / r (PMT is negative = adding each month)
function calcDebtGrowth(initialDebt, monthlyDeficit, annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;
  const debtGrowth = Math.abs(initialDebt) * Math.pow(1 + r, n) + Math.abs(monthlyDeficit) * ((Math.pow(1 + r, n) - 1) / r);
  return -debtGrowth;
}

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '—';
  const abs = Math.abs(val);
  if (abs >= 1000000) return `${val < 0 ? '-' : ''}₪${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${val < 0 ? '-' : ''}₪${Math.round(abs / 1000).toLocaleString()}K`;
  return `${val < 0 ? '-' : ''}₪${Math.round(abs).toLocaleString()}`;
};

export default function FinancialForecast({ incomeAverage, expenseAverage, cashFlowAverage, checkingBalance = 0, maleAge, femaleAge }) {
  const [customCashFlow, setCustomCashFlow] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');

  const currentAge = maleAge || femaleAge || null;
  const cashFlow1 = cashFlowAverage || 0;
  const customFlow = customCashFlow !== '' ? (parseFloat(customCashFlow) || 0) : null;
  const investAmt = parseFloat(investmentAmount) || 0;

  const INVEST_RATE = 0.10;
  const DEBT_RATE = 0.08;

  // Calculate scenario values at year X
  const calcScenario1 = (years) => {
    if (cashFlow1 >= 0) {
      return checkingBalance * Math.pow(1 + INVEST_RATE / 12, years * 12) + calcFutureValueAnnuity(cashFlow1, INVEST_RATE, years);
    } else {
      return calcDebtGrowth(checkingBalance, cashFlow1, DEBT_RATE, years);
    }
  };

  const calcScenario2 = (years) => {
    if (customFlow === null) return null;
    if (customFlow > 0) {
      return checkingBalance * Math.pow(1 + INVEST_RATE / 12, years * 12) + calcFutureValueAnnuity(customFlow, INVEST_RATE, years);
    } else if (customFlow === 0) {
      return 0;
    } else {
      return calcDebtGrowth(checkingBalance, customFlow, DEBT_RATE, years);
    }
  };

  const calcScenario3 = (years) => {
    if (investAmt <= 0) return null;
    return calcFutureValueAnnuity(investAmt, INVEST_RATE, years);
  };

  const s1_10 = calcScenario1(10);
  const s1_20 = calcScenario1(20);
  const s2_10 = calcScenario2(10);
  const s2_20 = calcScenario2(20);
  const s3_10 = calcScenario3(10);
  const s3_20 = calcScenario3(20);

  // Chart data
  const chartData = useMemo(() => {
    return Array.from({ length: 21 }, (_, year) => {
      const point = { year };
      point['ממשיכים כמו היום'] = Math.round(calcScenario1(year));
      if (customFlow !== null) point['מסלול מותאם'] = Math.round(calcScenario2(year) || 0);
      if (investAmt > 0) point['מסלול צמיחה'] = Math.round(calcScenario3(year) || 0);
      return point;
    });
  }, [cashFlow1, customFlow, investAmt, checkingBalance]);

  const isPositiveCashFlow = cashFlow1 >= 0;

  const gap = s3_20 !== null ? (s3_20 - s1_20) : null;

  const formatVal = (v) => {
    if (v === null || v === undefined) return '—';
    const abs = Math.abs(v);
    const prefix = v < 0 ? '-' : '';
    return `${prefix}₪${Math.round(abs).toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header - Current State */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#c8a863] to-[#1f9d47]" />
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-white/10">
              <Rocket className="w-6 h-6 text-[#c8a863]" />
            </div>
            <h2 className="text-xl font-bold">המצב הנוכחי שלך</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentAge && (
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-xs mb-1">גיל נוכחי</p>
                <p className="text-xl font-bold">{maleAge && femaleAge ? `${maleAge} / ${femaleAge}` : currentAge}</p>
                {maleAge && femaleAge && <p className="text-white/50 text-xs">גבר / אישה</p>}
              </div>
            )}
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/60 text-xs mb-1">הכנסות חודשיות</p>
              <p className="text-xl font-bold text-emerald-400">₪{(incomeAverage || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/60 text-xs mb-1">הוצאות חודשיות</p>
              <p className="text-xl font-bold text-rose-400">₪{(expenseAverage || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/60 text-xs mb-1">תזרים חודשי</p>
              <p className={`text-xl font-bold ${isPositiveCashFlow ? 'text-indigo-300' : 'text-red-400'}`}>
                ₪{cashFlow1.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Badge className={`${isPositiveCashFlow ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'} border px-4 py-1.5 text-sm`}>
              {isPositiveCashFlow ? '✅ תזרים חיובי' : '❌ תזרים שלילי'}
            </Badge>
            {checkingBalance !== 0 && (
              <Badge className={`${checkingBalance >= 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'} border border-current/30 px-4 py-1.5 text-sm`}>
                יתרת ע"ו: {checkingBalance >= 0 ? '+' : ''}₪{checkingBalance.toLocaleString()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {!isPositiveCashFlow && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">בהתאם לנתונים הנוכחיים, המשך ההתנהלות הקיימת צפוי להגדיל את החוב שלך לאורך השנים.</p>
        </div>
      )}
      {isPositiveCashFlow && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-emerald-700 text-sm">יש לך פוטנציאל לבניית הון משמעותי באמצעות השקעה עקבית לאורך זמן.</p>
        </div>
      )}

      {/* 3 Scenarios */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Scenario 1 */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-slate-400 to-slate-600" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-700">
              📊 ממשיכים בלי שינוי
            </CardTitle>
            <p className="text-xs text-slate-500">תזרים נוכחי: ₪{cashFlow1.toLocaleString()} / חודש</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`p-3 rounded-xl ${s1_10 >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
              <p className="text-xs text-slate-500 mb-1">בעוד 10 שנים</p>
              <p className={`text-xl font-bold ${s1_10 >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{formatVal(s1_10)}</p>
              <p className="text-xs text-slate-400">{s1_10 >= 0 ? '💰 הון צפוי' : '🔴 חוב צפוי'}</p>
            </div>
            <div className={`p-3 rounded-xl ${s1_20 >= 0 ? 'bg-indigo-50/70' : 'bg-red-50/70'}`}>
              <p className="text-xs text-slate-500 mb-1">בעוד 20 שנים</p>
              <p className={`text-xl font-bold ${s1_20 >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{formatVal(s1_20)}</p>
              <p className="text-xs text-slate-400">{s1_20 >= 0 ? '💰 הון צפוי' : '🔴 חוב צפוי'}</p>
            </div>
            <p className="text-xs text-slate-400">
              {s1_10 >= 0 ? 'הנחה: תשואה שנתית 10%, ריבית דריבית חודשית' : 'הנחה: ריבית חוב שנתית 8%, ריבית דריבית חודשית'}
            </p>
          </CardContent>
        </Card>

        {/* Scenario 2 */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-400 to-cyan-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700">
              🎯 מסלול מותאם אישית
            </CardTitle>
            <p className="text-xs text-slate-500">הזן תזרים חודשי חדש</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">תזרים חודשי חדש (₪)</Label>
              <Input
                type="number"
                value={customCashFlow}
                onChange={(e) => setCustomCashFlow(e.target.value)}
                placeholder="לדוגמה: 1500"
                className="border-blue-200 focus-visible:ring-blue-400"
              />
              <p className="text-xs text-slate-400">0 = ללא חיסכון, חיובי = חיסכון, שלילי = גידול חוב</p>
            </div>
            {customFlow !== null ? (
              <>
                <div className={`p-3 rounded-xl ${(s2_10 || 0) >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-slate-500 mb-1">בעוד 10 שנים</p>
                  <p className={`text-xl font-bold ${(s2_10 || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatVal(s2_10)}</p>
                </div>
                <div className={`p-3 rounded-xl ${(s2_20 || 0) >= 0 ? 'bg-blue-50/70' : 'bg-red-50/70'}`}>
                  <p className="text-xs text-slate-500 mb-1">בעוד 20 שנים</p>
                  <p className={`text-xl font-bold ${(s2_20 || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatVal(s2_20)}</p>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
                הזן תזרים חדש לחישוב
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scenario 3 */}
        <Card className="border-0 shadow-xl overflow-hidden border-2 border-emerald-200">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-700">
              🚀 בונים עתיד פיננסי
            </CardTitle>
            <p className="text-xs text-slate-500">הזן סכום חודשי להשקעה</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">סכום חודשי להשקעה (₪)</Label>
              <Input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder="לדוגמה: 2000"
                className="border-emerald-200 focus-visible:ring-emerald-400"
              />
              <p className="text-xs text-slate-400">תשואה שנתית 10%, ריבית דריבית חודשית</p>
            </div>
            {s3_10 !== null ? (
              <>
                <div className="p-3 rounded-xl bg-emerald-50">
                  <p className="text-xs text-slate-500 mb-1">בעוד 10 שנים</p>
                  <p className="text-xl font-bold text-emerald-700">{formatVal(s3_10)}</p>
                  <p className="text-xs text-slate-400">💰 הון צפוי</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70">
                  <p className="text-xs text-slate-500 mb-1">בעוד 20 שנים</p>
                  <p className="text-xl font-bold text-emerald-700">{formatVal(s3_20)}</p>
                  <p className="text-xs text-slate-400">💰 הון צפוי</p>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
                הזן סכום להשקעה לחישוב
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            גרף השוואת מסלולים (0–20 שנה)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tickFormatter={(v) => `${v}y`} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10, fill: '#64748b' }} width={70} />
              <Tooltip
                formatter={(value) => [formatVal(value), '']}
                labelFormatter={(label) => `שנה ${label}`}
                contentStyle={{ direction: 'rtl', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="ממשיכים כמו היום" stroke="#94a3b8" strokeWidth={2} dot={false} />
              {customFlow !== null && (
                <Line type="monotone" dataKey="מסלול מותאם" stroke="#3b82f6" strokeWidth={2} dot={false} />
              )}
              {investAmt > 0 && (
                <Line type="monotone" dataKey="מסלול צמיחה" stroke="#10b981" strokeWidth={3} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            טבלת השוואה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">תרחיש</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">בעוד 10 שנים</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">בעוד 20 שנים</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700">📊 ממשיכים כמו היום</td>
                  <td className={`text-center py-3 px-4 font-bold ${s1_10 >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{formatVal(s1_10)}</td>
                  <td className={`text-center py-3 px-4 font-bold ${s1_20 >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{formatVal(s1_20)}</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700">🎯 מסלול מותאם</td>
                  <td className={`text-center py-3 px-4 font-bold ${(s2_10 || 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{s2_10 !== null ? formatVal(s2_10) : '—'}</td>
                  <td className={`text-center py-3 px-4 font-bold ${(s2_20 || 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{s2_20 !== null ? formatVal(s2_20) : '—'}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-700">🚀 מסלול צמיחה</td>
                  <td className="text-center py-3 px-4 font-bold text-emerald-700">{s3_10 !== null ? formatVal(s3_10) : '—'}</td>
                  <td className="text-center py-3 px-4 font-bold text-emerald-700">{s3_20 !== null ? formatVal(s3_20) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      {gap !== null && (
        <Card className={`border-0 shadow-xl overflow-hidden ${Math.abs(gap) > 500000 ? 'border-2 border-amber-300' : ''}`}>
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">💡 המחיר של לא לעשות שינוי</h3>
                <p className="text-slate-600">
                  הפער בין המשך המצב הנוכחי לבין מסלול הצמיחה הוא{' '}
                  <span className="font-bold text-amber-700 text-xl">₪{Math.abs(Math.round(gap)).toLocaleString()}</span>
                  {' '}לאחר 20 שנה.
                </p>
                {Math.abs(gap) > 500000 && (
                  <p className="text-amber-700 mt-2 font-medium text-sm">
                    גם שינוי חודשי קטן יחסית עשוי ליצור פער של מאות אלפי שקלים ואף יותר לאורך השנים.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400">
          כל החישובים הם סימולציה בלבד המבוססת על הנחות קבועות ואינם מהווים התחייבות לתוצאה עתידית. הנחות: תשואה שנתית 10% להשקעות, ריבית חוב 8% שנתי.
        </p>
      </div>
    </div>
  );
}